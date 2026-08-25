import { Image } from 'expo-image';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { VideoAsset } from '@/types/video';

export type ContinueWatchingEntry = {
  video: VideoAsset;
  positionSeconds: number;
};

type ContinueWatchingRowProps = {
  entries: ContinueWatchingEntry[];
  onPress: (video: VideoAsset) => void;
};

export function ContinueWatchingRow({ entries, onPress }: ContinueWatchingRowProps) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>Continue Watching</ThemedText>
      <FlatList
        horizontal
        data={entries}
        keyExtractor={(entry) => entry.video.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const progress =
            item.video.duration && item.video.duration > 0
              ? item.positionSeconds / item.video.duration
              : 0;
          return (
            <Pressable style={styles.card} onPress={() => onPress(item.video)}>
              <View style={styles.thumbnailWrap}>
                {item.video.thumbnailUri ? (
                  <Image
                    source={{ uri: item.video.thumbnailUri }}
                    style={styles.thumbnail}
                    contentFit="cover"
                  />
                ) : (
                  <View style={[styles.thumbnail, styles.thumbnailPlaceholder]} />
                )}
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${Math.min(1, progress) * 100}%` }]} />
                </View>
              </View>
              <ThemedText numberOfLines={1} style={styles.filename}>
                {item.video.filename}
              </ThemedText>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  list: {
    paddingHorizontal: 16,
    gap: 10,
  },
  card: {
    width: 150,
    marginRight: 2,
  },
  thumbnailWrap: {
    width: 150,
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
    backgroundColor: '#1c1f22',
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
    backgroundColor: '#F97316',
  },
  filename: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '500',
  },
});
