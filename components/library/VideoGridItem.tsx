import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { memo, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Video, { type OnLoadData } from 'react-native-video';

import { ThemedText } from '@/components/themed-text';
import type { VideoAsset } from '@/types/video';
import { formatFileSize, formatTime } from '@/utils/formatTime';
import { generateThumbnail } from '@/utils/thumbnailCache';

type VideoGridItemProps = {
  video: VideoAsset;
  onPress: (video: VideoAsset) => void;
  onMeta: (id: string, patch: Partial<Pick<VideoAsset, 'duration' | 'thumbnailUri'>>) => void;
};

function VideoGridItemImpl({ video, onPress, onMeta }: VideoGridItemProps) {
  const [probingDuration, setProbingDuration] = useState(video.duration === null);
  const thumbnailRequested = useRef(false);

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

  const handleLoad = (data: OnLoadData) => {
    setProbingDuration(false);
    onMeta(video.id, { duration: data.duration });
  };

  return (
    <Pressable style={styles.card} onPress={() => onPress(video)}>
      <View style={styles.thumbnailWrap}>
        {video.thumbnailUri ? (
          <Image source={{ uri: video.thumbnailUri }} style={styles.thumbnail} contentFit="cover" />
        ) : (
          <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
            <Ionicons name="film-outline" size={28} color="#5a6672" />
          </View>
        )}
        {video.duration !== null ? (
          <View style={styles.durationBadge}>
            <ThemedText style={styles.durationText}>{formatTime(video.duration)}</ThemedText>
          </View>
        ) : null}
        {probingDuration ? (
          <Video
            source={{ uri: video.uri }}
            style={styles.hiddenProbe}
            paused
            muted
            resizeMode="contain"
            onLoad={handleLoad}
            onError={() => setProbingDuration(false)}
          />
        ) : null}
      </View>
      <ThemedText numberOfLines={1} style={styles.filename}>
        {video.filename}
      </ThemedText>
      <ThemedText style={styles.meta}>{formatFileSize(video.sizeBytes)}</ThemedText>
    </Pressable>
  );
}

export const VideoGridItem = memo(VideoGridItemImpl);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 6,
    maxWidth: '47%',
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
  hiddenProbe: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  filename: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '500',
  },
  meta: {
    fontSize: 11,
    opacity: 0.6,
    marginTop: 2,
  },
});
