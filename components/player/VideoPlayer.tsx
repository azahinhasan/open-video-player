import { forwardRef } from 'react';
import { StyleSheet } from 'react-native';
import Video, {
  OnAudioTracksData,
  OnBufferData,
  OnLoadData,
  OnPictureInPictureStatusChangedData,
  OnProgressData,
  OnVideoErrorData,
  ResizeMode,
  SelectedTrackType,
  VideoRef,
} from 'react-native-video';

export type VideoZoomMode = 'contain' | 'cover' | 'stretch';

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
   * Shown immediately in place of the video and only hidden once the first
   * real frame at the resolved start position has actually rendered
   * (react-native-video's onReadyForDisplay) — masks ExoPlayer's cold-start/
   * seek latency behind already-visible content instead of a black screen
   * or a jarring frame-0-then-jump, so resuming mid-video feels instant.
   */
  posterUri?: string | null;
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
export const VideoPlayer = forwardRef<VideoRef, VideoPlayerProps>(function VideoPlayer(
  {
    uri,
    paused,
    startPositionSeconds,
    rate = 1,
    loop = false,
    zoomMode = 'contain',
    selectedAudioTrackIndex,
    posterUri,
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
  ref
) {
  return (
    <Video
      ref={ref}
      source={{
        uri,
        startPosition: startPositionSeconds ? Math.floor(startPositionSeconds * 1000) : undefined,
      }}
      style={StyleSheet.absoluteFill}
      resizeMode={ZOOM_MODE_TO_RESIZE_MODE[zoomMode]}
      poster={posterUri ? { source: { uri: posterUri } } : undefined}
      posterResizeMode={zoomMode}
      paused={paused}
      rate={rate}
      repeat={loop}
      selectedAudioTrack={
        selectedAudioTrackIndex !== undefined && selectedAudioTrackIndex !== null
          ? { type: SelectedTrackType.INDEX, value: selectedAudioTrackIndex }
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
      onPictureInPictureStatusChanged={(e: OnPictureInPictureStatusChangedData) =>
        onPictureInPictureStatusChanged?.(e.isActive)
      }
      onRestoreUserInterfaceForPictureInPictureStop={onRestoreUserInterfaceForPictureInPictureStop}
      playInBackground={false}
      playWhenInactive={false}
    />
  );
});
