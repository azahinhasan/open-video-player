import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Image, StyleSheet, View, useWindowDimensions } from "react-native";
import Video, {
  BufferConfig,
  OnAudioTracksData,
  OnBufferData,
  OnLoadData,
  OnPictureInPictureStatusChangedData,
  OnProgressData,
  OnVideoErrorData,
  ResizeMode,
  SelectedTrackType,
  VideoRef,
  ViewType,
} from "react-native-video";

// ExoPlayer's defaults (minBufferMs ~15s, maxBufferMs ~50s,
// bufferForPlaybackMs ~2.5s) are tuned for network streaming, where they're
// a safety margin against stalls. This app only ever plays local files —
// already fully readable from disk the instant they're opened, with none of
// the network round-trips those margins exist for — so bufferForPlaybackMs
// in particular (how much must be buffered before playback *starts*) was
// pure added startup latency here, not a safety margin buying anything.
// One aggressive local-optimized config, applied to every source; if
// streaming is ever added, that's the point to branch this by source type,
// not before.
const LOCAL_FILE_BUFFER_CONFIG: BufferConfig = {
  minBufferMs: 1000,
  maxBufferMs: 3000,
  bufferForPlaybackMs: 200,
  bufferForPlaybackAfterRebufferMs: 500,
};

// --- Why this file no longer asks native to letterbox the video ---
//
// The flash previously seen ("video briefly fills edge-to-edge like
// COVER/STRETCH, then snaps into the correct letterboxed CONTAIN shape") is
// caused by ExoPlayer applying its resizeMode transform asynchronously,
// slightly after onReadyForDisplay fires — with no JS-visible event for
// "the transform has now been applied."
//
// The first attempt at fixing this computed the correctly-shaped
// letterboxed box in JS from onLoad's naturalSize — but onLoad only fires
// AFTER the <Video> component has already mounted at a fallback full-screen
// size, so the container still resized once, after mount, before settling
// on the real box. That resize-after-mount turned out to itself cause a
// visible hiccup (confirmed by testing: hardcoding the final box size from
// the very first render eliminated the flash completely; computing the same
// final size one render later did not).
//
// The real fix is this: VideoAsset already stores width/height for every
// video, captured once during the library scan — there's no need to
// discover naturalSize from the player at all. initialNaturalSize below is
// seeded from that already-known data, so containerStyle is correct on the
// very first render, and the container never resizes after mount. onLoad's
// naturalSize is still read as a fallback/correction for the rare case a
// video's stored dimensions are missing or wrong (e.g. a library entry
// scanned before width/height capture existed) — see handleLoad.
const READY_FALLBACK_TIMEOUT_MS = 12000;

// Small fixed buffer after onReadyForDisplay before revealing, for
// "cover"/"stretch" zoom modes (which don't use the pre-sized box at all,
// since they don't need letterboxing) and for the fallback case where no
// initialNaturalSize was available and naturalSize is only just now arriving
// from onLoad. Kept short since it's not doing the heavy lifting anymore.
const NON_CONTAIN_REVEAL_DELAY_MS = 150;

export type VideoZoomMode = "contain" | "cover" | "stretch";

type NaturalSize = { width: number; height: number };

type VideoPlayerProps = {
  uri: string;
  paused: boolean;
  /** User-facing mute (the player's mute button/volume-zero gesture) — combined with the internal startup-sync mute below, not a replacement for it. */
  muted?: boolean;
  startPositionSeconds?: number;
  rate?: number;
  loop?: boolean;
  zoomMode?: VideoZoomMode;
  /**
   * The video's real dimensions, already known from VideoAsset (captured
   * during the library scan) — pass video.width/video.height here whenever
   * available. Used to size the "contain" letterbox box correctly on the
   * very first render, so the container never resizes after mount (see the
   * top-of-file note for why that resize was itself the cause of the
   * startup flash, not just a cosmetic detail). Pass null/undefined only
   * when a video's dimensions genuinely aren't known yet (e.g. an older
   * library entry scanned before width/height capture existed) — in that
   * case this falls back to discovering size from onLoad instead, which
   * reintroduces the original resize-after-mount gap for that video only.
   */
  initialNaturalSize?: NaturalSize | null;
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
   * Shown immediately in place of the video and hidden once it's safe to
   * reveal (see the top-of-file note on how "safe" is determined per zoom
   * mode) — masks ExoPlayer's cold-start/seek latency behind already-visible
   * content instead of a black screen or a jarring frame-0-then-jump, so
   * resuming mid-video feels instant. When null (e.g. a reloadToken remount
   * mid-playback — see PlayerScreen), a plain black cover is used instead of
   * a thumbnail — a static thumbnail flash would read as a stutter there,
   * but leaving the resize flash completely uncovered on that path was a
   * gap, not a deliberate choice.
   */
  posterUri?: string | null;
  /**
   * Fires once the picture is actually visually accurate — the same signal
   * that hides the cover overlay above (or READY_FALLBACK_TIMEOUT_MS, if
   * that signal never comes). Lets the caller hold UI that would otherwise
   * visibly race ahead of the picture (the elapsed-time counter, the seek
   * bar) frozen until then.
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
      muted = false,
      startPositionSeconds,
      rate = 1,
      loop = false,
      zoomMode = "contain",
      initialNaturalSize = null,
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
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();

    // Seeded from the caller's already-known dimensions (see
    // initialNaturalSize's doc comment) rather than always starting null —
    // this is what makes containerStyle correct on the very first render.
    // This component is always given a fresh `key` per video (see
    // PlayerScreen), so a plain (non-lazy) useState initializer here is
    // fine: a genuinely new component instance is created per video, each
    // reading whatever initialNaturalSize it was mounted with.
    const [naturalSize, setNaturalSize] = useState<NaturalSize | null>(
      initialNaturalSize,
    );

    const [coverVisible, setCoverVisible] = useState(true);
    // Muted from mount until the cover hides (or the fallback below gives
    // up waiting) — decoding/rendering proceed on their own natural
    // schedule either way (muting doesn't touch that, unlike holding
    // `paused` would — that was tried and reverted, since it delayed the
    // surface-attach itself rather than overlapping with it). Audio simply
    // stays silent until the real picture is ready to be heard alongside,
    // instead of playing over the still-showing cover.
    const [startupMuted, setStartupMuted] = useState(true);
    const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const readyForDisplayFiredRef = useRef(false);

    const markPictureReady = useCallback(() => {
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
      if (revealTimerRef.current) {
        clearTimeout(revealTimerRef.current);
        revealTimerRef.current = null;
      }
      setCoverVisible(false);
      setStartupMuted(false);
      onPictureReady?.();
    }, [onPictureReady]);

    // Mount-only: this component is always given a fresh `key` (see
    // PlayerScreen) for a new video/source, so there's no case where `uri`
    // changes under an already-mounted instance that would need this to
    // re-run. Deliberately does NOT reset naturalSize here — the useState
    // initializer above already seeds it correctly for this specific mount;
    // resetting it to null here would immediately undo that seeding right
    // after the first paint, reintroducing the exact resize-after-mount gap
    // this whole approach exists to avoid.
    useEffect(() => {
      readyForDisplayFiredRef.current = false;
      setCoverVisible(true);
      setStartupMuted(true);
      fallbackTimerRef.current = setTimeout(
        markPictureReady,
        READY_FALLBACK_TIMEOUT_MS,
      );
      return () => {
        if (fallbackTimerRef.current) {
          clearTimeout(fallbackTimerRef.current);
        }
        if (revealTimerRef.current) {
          clearTimeout(revealTimerRef.current);
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleLoad = useCallback(
      (data: OnLoadData) => {
        // Only used as a fallback/correction now — the common case already
        // has the correct size from initialNaturalSize before this ever
        // fires. Still applied when it disagrees with what we were seeded
        // with (e.g. a stored width/height that's stale or wrong) or when
        // no initialNaturalSize was available at all.
        const size = data.naturalSize;
        if (size && size.width && size.height) {
          const rotated =
            data.naturalSize?.orientation === "portrait"
              ? size.width > size.height
              : data.naturalSize?.orientation === "landscape"
                ? size.height > size.width
                : false;
          const resolved = rotated
            ? { width: size.height, height: size.width }
            : { width: size.width, height: size.height };
          setNaturalSize((prev) =>
            prev &&
            prev.width === resolved.width &&
            prev.height === resolved.height
              ? prev
              : resolved,
          );
        }
        onLoad?.(data);
      },
      [onLoad],
    );

    const handleReadyForDisplay = useCallback(() => {
      if (readyForDisplayFiredRef.current) {
        return;
      }
      readyForDisplayFiredRef.current = true;
      // For "contain" with naturalSize already known (the common case now,
      // via initialNaturalSize), the container is already sized to the
      // exact correct aspect ratio from the very first render — resizeMode
      // COVER on an already-correctly-shaped box is an exact fill, nothing
      // left to transform, so it's safe to reveal on the very next frame.
      // Every other case (no initialNaturalSize and onLoad hasn't reported
      // one yet, or "cover"/"stretch" zoom modes) falls back to a short
      // fixed buffer, same as before.
      const isPreSizedContain = zoomMode === "contain" && naturalSize !== null;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (isPreSizedContain) {
            markPictureReady();
          } else {
            revealTimerRef.current = setTimeout(
              markPictureReady,
              NON_CONTAIN_REVEAL_DELAY_MS,
            );
          }
        });
      });
    }, [markPictureReady, zoomMode, naturalSize]);

    // The letterboxed box for "contain": computed from the real video
    // dimensions against the actual screen size. When naturalSize is
    // already known on the first render (the common case now), this is
    // correct immediately and the container never resizes after mount.
    const containerStyle = useMemo(() => {
      if (
        zoomMode !== "contain" ||
        !naturalSize ||
        !screenWidth ||
        !screenHeight
      ) {
        return StyleSheet.absoluteFillObject;
      }
      const videoAspect = naturalSize.width / naturalSize.height;
      const screenAspect = screenWidth / screenHeight;
      const boxWidth =
        videoAspect > screenAspect ? screenWidth : screenHeight * videoAspect;
      const boxHeight =
        videoAspect > screenAspect ? screenWidth / videoAspect : screenHeight;
      return {
        position: "absolute" as const,
        width: boxWidth,
        height: boxHeight,
        left: (screenWidth - boxWidth) / 2,
        top: (screenHeight - boxHeight) / 2,
      };
    }, [zoomMode, naturalSize, screenWidth, screenHeight]);

    // Once the container above is already the correctly-shaped box, the
    // video just needs to fill it exactly — COVER does that with no
    // cropping (the box's aspect ratio already matches the video's), and
    // critically involves no letterbox transform for native to compute
    // asynchronously. For every other case (naturalSize not yet known, or
    // "cover"/"stretch" zoom modes), fall back to the real resizeMode as
    // before.
    const effectiveResizeMode =
      zoomMode === "contain" && naturalSize
        ? ResizeMode.COVER
        : ZOOM_MODE_TO_RESIZE_MODE[zoomMode];

    return (
      <View style={styles.blackBackdrop}>
        <View style={containerStyle}>
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
            // startupMuted silences output only until the picture is ready
            // — playback/decoding keep running on their own schedule
            // underneath, so this doesn't delay the picture the way holding
            // `paused` did (see the effect above). Combined with the
            // caller's own user-facing `muted` (the mute button/volume-zero
            // gesture) via OR, since either one wanting silence should win.
            muted={startupMuted || muted}
            source={{
              uri,
              startPosition: startPositionSeconds
                ? Math.floor(startPositionSeconds * 1000)
                : undefined,
              bufferConfig: LOCAL_FILE_BUFFER_CONFIG,
            }}
            style={StyleSheet.absoluteFill}
            resizeMode={effectiveResizeMode}
            // TEXTURE composites reliably beneath the cover overlay below (a
            // real sibling View); SurfaceView punches through the view
            // hierarchy and isn't guaranteed to layer under a plain sibling
            // the same way.
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
            onLoad={handleLoad}
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
        </View>
        {coverVisible ? (
          posterUri ? (
            <Image
              source={{ uri: posterUri }}
              resizeMode={zoomMode}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            // No thumbnail available for this mount (e.g. a reloadToken
            // remount mid-playback — see PlayerScreen). A plain cover still
            // masks the same startup gap a thumbnail would, without
            // flashing an unrelated static image mid-playback.
            <View style={[StyleSheet.absoluteFill, styles.plainCover]} />
          )
        ) : null}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  blackBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
  plainCover: {
    backgroundColor: "#000",
  },
});
