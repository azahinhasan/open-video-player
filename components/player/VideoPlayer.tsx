import { forwardRef, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Video, {
  OnBufferData,
  OnLoadData,
  OnProgressData,
  OnVideoErrorData,
  ResizeMode,
  SelectedTrackType,
  TextTrackType,
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
  subtitleUri?: string | null;
  subtitlesEnabled?: boolean;
  onLoad?: (data: OnLoadData) => void;
  onProgress?: (data: OnProgressData) => void;
  onBuffer?: (data: OnBufferData) => void;
  onEnd?: () => void;
  onError?: (data: OnVideoErrorData) => void;
};

const ZOOM_MODE_TO_RESIZE_MODE: Record<VideoZoomMode, ResizeMode> = {
  contain: ResizeMode.CONTAIN,
  cover: ResizeMode.COVER,
  stretch: ResizeMode.STRETCH,
};

export const VideoPlayer = forwardRef<VideoRef, VideoPlayerProps>(function VideoPlayer(
  {
    uri,
    paused,
    startPositionSeconds,
    rate = 1,
    loop = false,
    zoomMode = 'contain',
    subtitleUri,
    subtitlesEnabled = true,
    onLoad,
    onProgress,
    onBuffer,
    onEnd,
    onError,
  },
  ref
) {
  const textTracks = useMemo(() => {
    if (!subtitleUri) {
      return undefined;
    }
    const isVtt = subtitleUri.toLowerCase().endsWith('.vtt');
    return [
      {
        title: 'Subtitle',
        language: 'en' as const,
        type: isVtt ? TextTrackType.VTT : TextTrackType.SUBRIP,
        uri: subtitleUri,
      },
    ];
  }, [subtitleUri]);

  return (
    <Video
      ref={ref}
      source={{
        uri,
        startPosition: startPositionSeconds ? Math.floor(startPositionSeconds * 1000) : undefined,
        textTracks,
      }}
      style={StyleSheet.absoluteFill}
      resizeMode={ZOOM_MODE_TO_RESIZE_MODE[zoomMode]}
      paused={paused}
      rate={rate}
      repeat={loop}
      selectedTextTrack={
        textTracks
          ? { type: subtitlesEnabled ? SelectedTrackType.INDEX : SelectedTrackType.DISABLED, value: 0 }
          : undefined
      }
      progressUpdateInterval={250}
      onLoad={onLoad}
      onProgress={onProgress}
      onBuffer={onBuffer}
      onEnd={onEnd}
      onError={onError}
      playInBackground={false}
      playWhenInactive={false}
    />
  );
});
