import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { memo, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition, ZoomIn, ZoomOut } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { usePlaybackStore } from '@/hooks/usePlaybackStore';
import { useAccentColor } from '@/hooks/useThemePreference';
import type { VideoAsset } from '@/types/video';
import { formatTime } from '@/utils/formatTime';
import { generateThumbnail } from '@/utils/thumbnailCache';
import { isRecentlyAdded } from '@/utils/videoProperties';

type VideoGridItemProps = {
  video: VideoAsset;
  onPress: (video: VideoAsset) => void;
  onLongPress?: (video: VideoAsset) => void;
  onMeta: (id: string, patch: Partial<Pick<VideoAsset, 'duration' | 'thumbnailUri'>>) => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (video: VideoAsset) => void;
};

function VideoGridItemImpl({
  video,
  onPress,
  onLongPress,
  onMeta,
  selectable = false,
  selected = false,
  onToggleSelect,
}: VideoGridItemProps) {
  const thumbnailRequested = useRef(false);
  const resumeEntry = usePlaybackStore((s) => s.history[video.id]);
  const viewed = usePlaybackStore((s) => s.viewed[video.id]);
  const accentColor = useAccentColor();
  const resumeProgress =
    resumeEntry && video.duration ? Math.min(1, resumeEntry.positionSeconds / video.duration) : 0;
  const isNew = isRecentlyAdded(video.creationTime) && !viewed;

  useEffect(() => {
    if (video.thumbnailUri !== null || thumbnailRequested.current) {
      return;
    }
    thumbnailRequested.current = true;
    generateThumbnail(video.uri, video.id).then((uri) => {
      if (uri) {
        onMeta(video.id, { thumbnailUri: uri });
      }
    });
  }, [video.id, video.thumbnailUri, video.uri, onMeta]);

  return (
    <Animated.View style={styles.card} entering={FadeIn} exiting={FadeOut.duration(200)} layout={LinearTransition.duration(220)}>
      <Pressable
        style={styles.pressable}
        onPress={() => (selectable ? onToggleSelect?.(video) : onPress(video))}
        onLongPress={selectable ? undefined : onLongPress ? () => onLongPress(video) : undefined}>
        <View style={styles.thumbnailWrap}>
          {video.thumbnailUri ? (
            <Image source={{ uri: video.thumbnailUri }} style={styles.thumbnail} contentFit="cover" />
          ) : (
            <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
              <Ionicons name="film-outline" size={28} color="#5a6672" />
            </View>
          )}
          {selectable ? (
            <Animated.View
              entering={ZoomIn.duration(150)}
              exiting={ZoomOut.duration(150)}
              style={[styles.checkCircle, selected ? { backgroundColor: accentColor, borderColor: accentColor } : null]}>
              {selected ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
            </Animated.View>
          ) : null}
          {isNew ? (
            <View style={[styles.newBadge, { backgroundColor: accentColor }]}>
              <ThemedText style={styles.newBadgeText}>NEW</ThemedText>
            </View>
          ) : null}
          {video.duration !== null ? (
            <View style={styles.durationBadge}>
              <ThemedText style={styles.durationText}>{formatTime(video.duration)}</ThemedText>
            </View>
          ) : null}
          {resumeProgress > 0 ? (
            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: `${resumeProgress * 100}%`, backgroundColor: accentColor }]}
              />
            </View>
          ) : null}
        </View>
        <ThemedText numberOfLines={1} style={styles.filename}>
          {video.filename}
        </ThemedText>
      </Pressable>
    </Animated.View>
  );
}

export const VideoGridItem = memo(VideoGridItemImpl);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 6,
    maxWidth: '47%',
  },
  pressable: {
    flex: 1,
  },
  thumbnailWrap: {
    aspectRatio: 16 / 9,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#1c1f22',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationBadge: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  durationText: {
    color: '#fff',
    fontSize: 11,
  },
  newBadge: {
    position: 'absolute',
    left: 6,
    top: 6,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  checkCircle: {
    position: 'absolute',
    right: 6,
    top: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  progressFill: {
    height: '100%',
  },
  filename: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '500',
  },
});
