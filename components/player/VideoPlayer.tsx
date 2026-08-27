import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { Image, StyleSheet } from "react-native";
import Video, {
  OnAudioTracksData,
  OnBufferData,
  OnLoadData,
  OnPictureInPictureStatusChangedData,
  OnProgressData,
  OnVideoErrorData,
  ResizeMode,
  SelectedTrackType,
  ViewType,
  VideoRef,
} from "react-native-video";

// react-native-video's own onReadyForDisplay-driven poster hide fires as
// soon as ExoPlayer reaches STATE_READY — well before the native PlayerView
// actually resizes itself to the decoded frame's real aspect ratio (measured
// via frame-by-frame screen recording at ~4s on this device/build — driven
// by ExoPlayerView.kt's Player.EVENT_VIDEO_SIZE_CHANGED listener, not
// anything exposed to JS, so there's no earlier reliable signal to hook).
// Revealing before that resize completes flashes a wrong-shaped ("thin
// band") video for the remaining gap. Holding our own overlay past it masks
// the settling instead. This is also the earliest point the picture is
// actually, visually accurate — see onPictureReady, which fires here too.
//
// Tried gating actual playback (via `paused`) on this same signal so audio
// couldn't start before it, on the theory that the surface-attach delay
// above was itself gated on STATE_READY. It isn't — that attach only
// starts once playback actually begins, so holding `paused` just delayed
// the same gap instead of overlapping it, making the total wait longer.
// Reverted; audio starting ahead of the picture is masked (not eliminated)
// by the poster below instead.
const POSTER_HIDE_DELAY_MS = 4500;

// Safety net in case onReadyForDisplay never fires for this source (an
// audio-only file has no video frame to report ready, and a genuinely
// broken file may never reach STATE_READY at all) — without this, the
// poster (if any) and the caller's pictureReady gate would stay stuck
// forever instead of just missing their sync-with-picture goal for that
// one file. Deliberately well past POSTER_HIDE_DELAY_MS plus a generous
// allowance for onReadyForDisplay itself being slow on an underpowered
// device: this only exists to recover a genuinely-stuck load, not to race
// a merely-slow one, which would hide the poster before the real picture
// has actually settled.
const READY_FALLBACK_TIMEOUT_MS = 12000;

export type VideoZoomMode = "contain" | "cover" | "stretch";

type VideoPlayerProps = {
  uri: string;
  paused: boolean;
  startPositionSeconds?: number;
  rate?: number;
  loop?: boolean;
  zoomMode?: VideoZoomMode;
  /**
   * Native track index (from OnLoadData/OnAudioTracksData.audioTracks) to
   * play — undefined/null lets the player use its own default rather than
   * applying an explicit override. Left unset unless the user has
   * deliberately picked a non-default track (see PlayerScreen), since
   * forcing an override even for the already-active default track means an
   * extra unnecessary decoder reinitialization.
   */
  selectedAudioTrackIndex?: number | null;
  /**
   * Shown immediately in place of the video and hidden a short beat after
   * playback becomes ready — masks ExoPlayer's cold-start/seek latency (and
   * the video surface's own aspect-ratio settling, see
   * POSTER_HIDE_DELAY_MS) behind already-visible content instead of a black
   * screen or a jarring frame-0-then-jump, so resuming mid-video feels
   * instant.
   */
  posterUri?: string | null;
  /**
   * Fires once the picture is actually visually accurate — the same
   * onReadyForDisplay-plus-settling-delay signal that hides the poster
   * above (or READY_FALLBACK_TIMEOUT_MS, if that signal never comes). Lets
   * the caller hold UI that would otherwise visibly race ahead of the
   * picture (the elapsed-time counter, the seek bar) frozen until then.
   */
  onPictureReady?: () => void;
  /** Auto-enters Picture-in-Picture when the user backgrounds the app while playing. */
  enterPictureInPictureOnLeave?: boolean;
  onLoad?: (data: OnLoadData) => void;
  onProgress?: (data: OnProgressData) => void;
  onBuffer?: (data: OnBufferData) => void;
  onEnd?: () => void;
  onError?: (data: OnVideoErrorData) => void;
  /** Fires on load AND whenever the native player's own track state changes (e.g. after a selection actually takes effect) — a more reliable source of "what's really playing" than assuming our own request succeeded. */
  onAudioTracks?: (data: OnAudioTracksData) => void;
  onPictureInPictureStatusChanged?: (isActive: boolean) => void;
  onRestoreUserInterfaceForPictureInPictureStop?: () => void;
};

const ZOOM_MODE_TO_RESIZE_MODE: Record<VideoZoomMode, ResizeMode> = {
  contain: ResizeMode.CONTAIN,
  cover: ResizeMode.COVER,
  stretch: ResizeMode.STRETCH,
};

// Subtitles are rendered by SubtitleOverlay (a JS-drawn, fully styleable
// overlay) rather than react-native-video's native text tracks — the
// library's own subtitle styling is Android-only and can't do color/bold/
// background (see utils/subtitleParser.ts's callers), so this component no
// longer needs to know about subtitles at all.
export const VideoPlayer = forwardRef<VideoRef, VideoPlayerProps>(
  function VideoPlayer(
    {
      uri,
      paused,
      startPositionSeconds,
      rate = 1,
      loop = false,
      zoomMode = "contain",
      selectedAudioTrackIndex,
      posterUri,
      onPictureReady,
      enterPictureInPictureOnLeave = false,
      onLoad,
      onProgress,
      onBuffer,
      onEnd,
      onError,
      onAudioTracks,
      onPictureInPictureStatusChanged,
      onRestoreUserInterfaceForPictureInPictureStop,
    },
    ref,
  ) {
    const [posterVisible, setPosterVisible] = useState(!!posterUri);
    // Muted from mount until the same moment the poster hides (or the
    // fallback below gives up waiting) — decoding/rendering proceed on
    // their own natural schedule either way (muting doesn't touch that, is
    // unlike holding `paused` — see POSTER_HIDE_DELAY_MS's comment above),
    // so audio simply stays silent until the real picture is ready to be
    // heard alongside, instead of playing over the still-showing poster.
    const [audioMuted, setAudioMuted] = useState(true);
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
      setPosterVisible(!!posterUri);
    }, [posterUri]);

    const markPictureReady = useCallback(() => {
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
      }
      setPosterVisible(false);
      setAudioMuted(false);
      onPictureReady?.();
    }, [onPictureReady]);

    // Mount-only: this component is always given a fresh `key` (see
    // PlayerScreen) for a new video/source, so there's no case where `uri`
    // changes under an already-mounted instance that would need this to
    // re-run.
    useEffect(() => {
      fallbackTimerRef.current = setTimeout(
        markPictureReady,
        READY_FALLBACK_TIMEOUT_MS,
      );
      return () => {
        if (fallbackTimerRef.current) {
          clearTimeout(fallbackTimerRef.current);
        }
        if (hideTimerRef.current) {
          clearTimeout(hideTimerRef.current);
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleReadyForDisplay = useCallback(() => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
      hideTimerRef.current = setTimeout(markPictureReady, POSTER_HIDE_DELAY_MS);
    }, [markPictureReady]);

    return (
      <>
        <Video
          ref={ref}
          // paused/muted are deliberately declared before source: this
          // native module applies props one at a time in roughly this
          // order, and setting the source is what actually creates the
          // player and applies its initial paused/muted state — so these
          // need to already be known by that point rather than arriving
          // after, which is exactly the kind of ordering race that caused
          // audio to ignore an initial paused={true} in the first place.
          paused={paused}
          // Silences output only — playback/decoding keep running on their
          // own schedule underneath (see audioMuted above), so this doesn't
          // delay the picture the way holding `paused` did.
          muted={audioMuted}
          source={{
            uri,
            startPosition: startPositionSeconds
              ? Math.floor(startPositionSeconds * 1000)
              : undefined,
          }}
          style={StyleSheet.absoluteFill}
          resizeMode={ZOOM_MODE_TO_RESIZE_MODE[zoomMode]}
          // Android's default renderer (SurfaceView) punches through the
          // normal view hierarchy and doesn't reliably composite beneath a
          // plain sibling view the way the poster below assumes — TextureView
          // is a real View and always does, at a small perf/battery cost
          // that's a non-issue for this app's single-video-at-a-time player.
          viewType={ViewType.TEXTURE}
          rate={rate}
          repeat={loop}
          selectedAudioTrack={
            selectedAudioTrackIndex !== undefined &&
            selectedAudioTrackIndex !== null
              ? {
                  type: SelectedTrackType.INDEX,
                  value: selectedAudioTrackIndex,
                }
              : undefined
          }
          progressUpdateInterval={250}
          enterPictureInPictureOnLeave={enterPictureInPictureOnLeave}
          onLoad={onLoad}
          onProgress={onProgress}
          onBuffer={onBuffer}
          onEnd={onEnd}
          onError={onError}
          onAudioTracks={onAudioTracks}
          onReadyForDisplay={handleReadyForDisplay}
          onPictureInPictureStatusChanged={(
            e: OnPictureInPictureStatusChangedData,
          ) => onPictureInPictureStatusChanged?.(e.isActive)}
          onRestoreUserInterfaceForPictureInPictureStop={
            onRestoreUserInterfaceForPictureInPictureStop
          }
          playInBackground={false}
          playWhenInactive={false}
        />
        {posterUri && posterVisible ? (
          <Image
            source={{ uri: posterUri }}
            resizeMode={zoomMode}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
      </>
    );
  },
);
