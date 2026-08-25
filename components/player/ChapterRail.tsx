import * as Haptics from 'expo-haptics';
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
  type DerivedValue,
} from 'react-native-reanimated';

import { useAccentColor } from '@/hooks/useThemePreference';
import { playerColors } from '@/theme/tokens';
import { getChapters, type Chapter } from '@/utils/chapters';
import { formatTime } from '@/utils/formatTime';
import { generateChapterThumbnail } from '@/utils/thumbnailCache';

type ChapterRailProps = {
  videoUri: string;
  videoId: string;
  duration: number;
  currentTime: number;
  buffering?: boolean;
  onSeek: (time: number) => void;
  onScrubStart?: () => void;
  onScrubEnd?: () => void;
};

export function ChapterRail({
  videoUri,
  videoId,
  duration,
  currentTime,
  buffering,
  onSeek,
  onScrubStart,
  onScrubEnd,
}: ChapterRailProps) {
  const chapters = useMemo(() => getChapters(duration), [duration]);
  const accentColor = useAccentColor();

  const railWidth = useSharedValue(0);
  const progressFraction = useSharedValue(0);
  const dragFraction = useSharedValue(0);
  const isDragging = useSharedValue(false);

  const [previewChapterIndex, setPreviewChapterIndex] = useState<number | null>(null);
  const [previewSeconds, setPreviewSeconds] = useState(0);
  const [previewThumbnail, setPreviewThumbnail] = useState<string | null>(null);
  const thumbnailCacheRef = useRef<Record<number, string | null>>({});

  useEffect(() => {
    progressFraction.value = duration > 0 ? currentTime / duration : 0;
  }, [currentTime, duration, progressFraction]);

  const displayFraction = useDerivedValue(() =>
    isDragging.value ? dragFraction.value : progressFraction.value
  );

  const triggerSegmentHaptic = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
  }, []);

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
    () => {
      if (chapters.length === 0) {
        return -1;
      }
      const idx = Math.floor(dragFraction.value * chapters.length);
      return Math.min(chapters.length - 1, Math.max(0, idx));
    },
    (index, previous) => {
      if (index !== previous) {
        runOnJS(setPreviewChapterIndex)(index);
        // previous === null is the reaction's initial fire (not a real crossing);
        // only tick while an actual drag is in progress.
        if (previous !== null && isDragging.value) {
          runOnJS(triggerSegmentHaptic)();
        }
      }
    },
    [chapters.length]
  );

  useEffect(() => {
    if (previewChapterIndex === null) {
      return;
    }
    const cached = thumbnailCacheRef.current[previewChapterIndex];
    if (cached !== undefined) {
      setPreviewThumbnail(cached);
      return;
    }
    const chapter = chapters[previewChapterIndex];
    if (!chapter) {
      return;
    }
    let cancelled = false;
    generateChapterThumbnail(
      videoUri,
      videoId,
      previewChapterIndex,
      Math.floor(chapter.startTime * 1000) + 500
    ).then((uri) => {
      thumbnailCacheRef.current[previewChapterIndex] = uri;
      if (!cancelled) {
        setPreviewThumbnail(uri);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [previewChapterIndex, chapters, videoUri, videoId]);

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
        .onEnd(() => {
          isDragging.value = false;
          // Whether this was a quick tap or a drag, seek to exactly where the
          // finger ended up — dragFraction already reflects that position,
          // since onBegin seeds it immediately even for a zero-movement tap.
          runOnJS(commitSeek)(dragFraction.value);
          if (onScrubEnd) {
            runOnJS(onScrubEnd)();
          }
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [commitSeek, onScrubStart, onScrubEnd]
  );

  const previewStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isDragging.value ? 1 : 0, { duration: 150 }),
    left: `${dragFraction.value * 100}%`,
  }));

  const playheadStyle = useAnimatedStyle(() => ({
    left: `${displayFraction.value * 100}%`,
  }));

  return (
    <View style={styles.wrapper}>
      <GestureDetector gesture={panGesture}>
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

          <View style={styles.rail}>
            {chapters.map((chapter) => (
              <ChapterSegment
                key={chapter.index}
                chapter={chapter}
                displayFraction={displayFraction}
                accentColor={accentColor}
              />
            ))}
          </View>
          {buffering ? (
            <Animated.View style={[styles.bufferingDot, playheadStyle]} pointerEvents="none" />
          ) : null}
        </View>
      </GestureDetector>
    </View>
  );
}

function ChapterSegment({
  chapter,
  displayFraction,
  accentColor,
}: {
  chapter: Chapter;
  displayFraction: DerivedValue<number>;
  accentColor: string;
}) {
  const fillStyle = useAnimatedStyle(() => {
    const frac = displayFraction.value;
    let filled = 0;
    if (frac >= chapter.endFraction) {
      filled = 1;
    } else if (frac > chapter.startFraction) {
      filled = (frac - chapter.startFraction) / (chapter.endFraction - chapter.startFraction);
    }
    const isCurrent = frac >= chapter.startFraction && frac < chapter.endFraction;
    return {
      width: `${filled * 100}%`,
      backgroundColor: isCurrent ? accentColor : playerColors.chapterWatched,
    };
  });

  const trackStyle = useAnimatedStyle(() => {
    const frac = displayFraction.value;
    const isCurrent = frac >= chapter.startFraction && frac < chapter.endFraction;
    const isUpcoming = frac < chapter.startFraction;
    return {
      opacity: isCurrent ? 1 : 0.85,
      backgroundColor: isUpcoming ? 'transparent' : playerColors.chapterWatched,
      borderColor: playerColors.chapterUpcoming,
      borderWidth: isUpcoming ? 1 : 0,
    };
  });

  return (
    <Animated.View style={[styles.segmentTrack, trackStyle]}>
      <Animated.View style={[styles.segmentFill, fillStyle]} />
    </Animated.View>
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
  rail: {
    flexDirection: 'row',
    height: 6,
    gap: 3,
  },
  segmentTrack: {
    flex: 1,
    height: '100%',
    borderRadius: 3,
    overflow: 'hidden',
  },
  segmentFill: {
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
