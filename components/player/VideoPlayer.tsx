import { forwardRef } from 'react';
import { StyleSheet } from 'react-native';
import Video, {
  OnBufferData,
  OnLoadData,
  OnPictureInPictureStatusChangedData,
  OnProgressData,
  OnVideoErrorData,
  ResizeMode,
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
  /** Auto-enters Picture-in-Picture when the user backgrounds the app while playing. */
  enterPictureInPictureOnLeave?: boolean;
  onLoad?: (data: OnLoadData) => void;
  onProgress?: (data: OnProgressData) => void;
  onBuffer?: (data: OnBufferData) => void;
  onEnd?: () => void;
  onError?: (data: OnVideoErrorData) => void;
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
    enterPictureInPictureOnLeave = false,
    onLoad,
    onProgress,
    onBuffer,
    onEnd,
    onError,
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
      paused={paused}
      rate={rate}
      repeat={loop}
      progressUpdateInterval={250}
      enterPictureInPictureOnLeave={enterPictureInPictureOnLeave}
      onLoad={onLoad}
      onProgress={onProgress}
      onBuffer={onBuffer}
      onEnd={onEnd}
      onError={onError}
      onPictureInPictureStatusChanged={(e: OnPictureInPictureStatusChangedData) =>
        onPictureInPictureStatusChanged?.(e.isActive)
      }
      onRestoreUserInterfaceForPictureInPictureStop={onRestoreUserInterfaceForPictureInPictureStop}
      playInBackground={false}
      playWhenInactive={false}
    />
  );
});
