import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { memo, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { usePlaybackStore } from '@/hooks/usePlaybackStore';
import { useAccentColor } from '@/hooks/useThemePreference';
import type { VideoAsset } from '@/types/video';
import { formatTime } from '@/utils/formatTime';
import { generateThumbnail } from '@/utils/thumbnailCache';
import { isRecentlyAdded } from '@/utils/videoProperties';

type VideoListItemProps = {
  video: VideoAsset;
  onPress: (video: VideoAsset) => void;
  onLongPress?: (video: VideoAsset) => void;
  onMeta: (id: string, patch: Partial<Pick<VideoAsset, 'duration' | 'thumbnailUri'>>) => void;
};

function VideoListItemImpl({ video, onPress, onLongPress, onMeta }: VideoListItemProps) {
  const thumbnailRequested = useRef(false);
  const resumeEntry = usePlaybackStore((s) => s.history[video.id]);
  const accentColor = useAccentColor();
  const resumeProgress =
    resumeEntry && video.duration ? Math.min(1, resumeEntry.positionSeconds / video.duration) : 0;
  const isNew = isRecentlyAdded(video.creationTime);

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
    <Pressable
      style={styles.row}
      onPress={() => onPress(video)}
      onLongPress={onLongPress ? () => onLongPress(video) : undefined}>
      <View style={styles.thumbnailWrap}>
        {video.thumbnailUri ? (
          <Image source={{ uri: video.thumbnailUri }} style={styles.thumbnail} contentFit="cover" />
        ) : (
          <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
            <Ionicons name="film-outline" size={22} color="#5a6672" />
          </View>
        )}
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
      <ThemedText numberOfLines={2} style={styles.filename}>
        {video.filename}
      </ThemedText>
    </Pressable>
  );
}

export const VideoListItem = memo(VideoListItemImpl);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  thumbnailWrap: {
    width: 120,
    aspectRatio: 16 / 9,
    borderRadius: 8,
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
    right: 4,
    bottom: 4,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  durationText: {
    color: '#fff',
    fontSize: 10,
  },
  newBadge: {
    position: 'absolute',
    left: 4,
    top: 4,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
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
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
});
