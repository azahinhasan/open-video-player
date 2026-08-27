import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useAccentColor } from '@/hooks/useThemePreference';
import { playerColors } from '@/theme/tokens';
import { formatTime } from '@/utils/formatTime';
import { generateSeekPreviewThumbnail } from '@/utils/thumbnailCache';

type SeekBarProps = {
  videoUri: string;
  videoId: string;
  duration: number;
  currentTime: number;
  buffering?: boolean;
  onSeek: (time: number) => void;
  onScrubStart?: () => void;
  onScrubEnd?: () => void;
};

// Divides the video into fixed slices purely for scrub-preview thumbnail
// caching — dragging across many nearby positions reuses the same cached
// frame instead of generating a new one on every pixel of movement. Not a
// visible segment/chapter boundary; the bar itself is one continuous track.
const PREVIEW_BUCKETS = 40;

export function SeekBar({
  videoUri,
  videoId,
  duration,
  currentTime,
  buffering,
  onSeek,
  onScrubStart,
  onScrubEnd,
}: SeekBarProps) {
  const accentColor = useAccentColor();

  const railWidth = useSharedValue(0);
  // Seeded from the initial props (not 0) — currentTime/duration already
  // reflect the resumed position on first render (see PlayerScreen's
  // resolveResumeSeconds), so this needs to match from the start too,
  // rather than rendering an empty bar for one frame before the effect
  // below corrects it.
  const progressFraction = useSharedValue(duration > 0 ? currentTime / duration : 0);
  const dragFraction = useSharedValue(0);
  const isDragging = useSharedValue(false);

  const [previewBucket, setPreviewBucket] = useState<number | null>(null);
  const [previewSeconds, setPreviewSeconds] = useState(0);
  const [previewThumbnail, setPreviewThumbnail] = useState<string | null>(null);
  const thumbnailCacheRef = useRef<Record<number, string | null>>({});

  useEffect(() => {
    progressFraction.value = duration > 0 ? currentTime / duration : 0;
  }, [currentTime, duration, progressFraction]);

  const displayFraction = useDerivedValue(() =>
    isDragging.value ? dragFraction.value : progressFraction.value
  );

  useAnimatedReaction(
    () => Math.floor(dragFraction.value * duration),
    (seconds, previous) => {
      if (seconds !== previous) {
        runOnJS(setPreviewSeconds)(seconds);
      }
    },
    [duration]
  );

  useAnimatedReaction(
    () => (duration > 0 ? Math.min(PREVIEW_BUCKETS - 1, Math.floor(dragFraction.value * PREVIEW_BUCKETS)) : -1),
    (bucket, previous) => {
      if (bucket !== previous) {
        runOnJS(setPreviewBucket)(bucket);
      }
    },
    [duration]
  );

  useEffect(() => {
    if (previewBucket === null || duration <= 0) {
      return;
    }
    const cached = thumbnailCacheRef.current[previewBucket];
    if (cached !== undefined) {
      setPreviewThumbnail(cached);
      return;
    }
    let cancelled = false;
    const timeSeconds = ((previewBucket + 0.5) / PREVIEW_BUCKETS) * duration;
    generateSeekPreviewThumbnail(videoUri, videoId, previewBucket, Math.floor(timeSeconds * 1000)).then((uri) => {
      thumbnailCacheRef.current[previewBucket] = uri;
      if (!cancelled) {
        setPreviewThumbnail(uri);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [previewBucket, duration, videoUri, videoId]);

  const commitSeek = useCallback(
    (fraction: number) => {
      onSeek(Math.min(duration, Math.max(0, fraction * duration)));
    },
    [duration, onSeek]
  );

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .onBegin((event) => {
          isDragging.value = true;
          const width = railWidth.value || 1;
          dragFraction.value = Math.min(1, Math.max(0, event.x / width));
          if (onScrubStart) {
            runOnJS(onScrubStart)();
          }
        })
        .onUpdate((event) => {
          const width = railWidth.value || 1;
          dragFraction.value = Math.min(1, Math.max(0, event.x / width));
        })
        .onEnd((_event, success) => {
          // Only a genuine drag reaches here successfully — a tap with truly
          // zero movement between touch-down and lift-off never gets a
          // touches-moved event to activate on, so minDistance(0) alone
          // doesn't reliably catch it (most visible on emulators/precise
          // taps, which don't add the finger jitter a real touch usually
          // does). tapGesture below is the dedicated fallback for that case.
          if (!success) {
            return;
          }
          runOnJS(commitSeek)(dragFraction.value);
        })
        .onFinalize(() => {
          // Runs regardless of whether the gesture ended, failed, or was
          // cancelled (e.g. tapGesture won the race) — the alternative,
          // doing this only in onEnd, left isDragging stuck true forever
          // whenever Pan never activated.
          isDragging.value = false;
          if (onScrubEnd) {
            runOnJS(onScrubEnd)();
          }
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [commitSeek, onScrubStart, onScrubEnd]
  );

  const tapGesture = useMemo(
    () =>
      Gesture.Tap()
        .maxDuration(250)
        .onEnd((event, success) => {
          if (!success) {
            return;
          }
          const width = railWidth.value || 1;
          runOnJS(commitSeek)(Math.min(1, Math.max(0, event.x / width)));
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [commitSeek]
  );

  // Race, not Simultaneous: panGesture usually wins (minDistance(0) lets it
  // activate on the first touches-moved event, which most real taps still
  // produce via finger jitter) and drives the live drag preview via
  // onUpdate. tapGesture only wins — and only then calls commitSeek — for
  // the zero-movement taps panGesture's onEnd never gets called for.
  const seekGesture = useMemo(
    () => Gesture.Race(panGesture, tapGesture),
    [panGesture, tapGesture]
  );

  const previewStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isDragging.value ? 1 : 0, { duration: 150 }),
    left: `${dragFraction.value * 100}%`,
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: `${displayFraction.value * 100}%`,
    backgroundColor: accentColor,
  }));

  const playheadStyle = useAnimatedStyle(() => ({
    left: `${displayFraction.value * 100}%`,
  }));

  return (
    <View style={styles.wrapper}>
      <GestureDetector gesture={seekGesture}>
        <View
          style={styles.touchArea}
          onLayout={(event) => {
            railWidth.value = event.nativeEvent.layout.width;
          }}>
          <Animated.View style={[styles.previewBubble, previewStyle]} pointerEvents="none">
            <View style={styles.previewThumbnailWrap}>
              {previewThumbnail ? (
                <Image
                  source={{ uri: previewThumbnail }}
                  style={styles.previewThumbnail}
                  contentFit="cover"
                />
              ) : null}
            </View>
            <Text style={styles.previewTime}>{formatTime(previewSeconds)}</Text>
          </Animated.View>

          <View style={styles.track}>
            <Animated.View style={[styles.fill, fillStyle]} />
          </View>
          {buffering ? (
            <Animated.View style={[styles.bufferingDot, playheadStyle]} pointerEvents="none" />
          ) : null}
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
  },
  touchArea: {
    height: 32,
    justifyContent: 'center',
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: playerColors.seekTrack,
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  bufferingDot: {
    position: 'absolute',
    top: '50%',
    marginTop: -5,
    marginLeft: -5,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  previewBubble: {
    position: 'absolute',
    bottom: 44,
    alignItems: 'center',
    transform: [{ translateX: -40 }],
    width: 80,
  },
  previewThumbnailWrap: {
    width: 80,
    height: 45,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1c1f22',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  previewThumbnail: {
    width: '100%',
    height: '100%',
  },
  previewTime: {
    marginTop: 4,
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
});
