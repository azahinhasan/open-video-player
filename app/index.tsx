import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

import { ContinueWatchingRow } from '@/components/library/ContinueWatchingRow';
import { FolderPicker } from '@/components/library/FolderPicker';
import { SortControl, type SortMode } from '@/components/library/SortControl';
import { VideoGridItem } from '@/components/library/VideoGridItem';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { usePlaybackStore } from '@/hooks/usePlaybackStore';
import { useVideoLibrary } from '@/hooks/useVideoLibrary';
import type { VideoAsset } from '@/types/video';

function sortVideos(videos: VideoAsset[], mode: SortMode): VideoAsset[] {
  const sorted = [...videos];
  switch (mode) {
    case 'date':
      sorted.sort((a, b) => (b.modificationTime ?? 0) - (a.modificationTime ?? 0));
      break;
    case 'duration':
      sorted.sort((a, b) => (b.duration ?? 0) - (a.duration ?? 0));
      break;
    case 'name':
    default:
      sorted.sort((a, b) => a.filename.localeCompare(b.filename));
      break;
  }
  return sorted;
}

export default function LibraryScreen() {
  const { folderUri, folderName, videos, status, error, pickFolder, rescan, updateVideoMeta } =
    useVideoLibrary();
  const setQueue = usePlaybackStore((s) => s.setQueue);
  const history = usePlaybackStore((s) => s.history);
  const router = useRouter();
  const [sortMode, setSortMode] = useState<SortMode>('name');

  const sortedVideos = useMemo(() => sortVideos(videos, sortMode), [videos, sortMode]);

  const continueWatching = useMemo(() => {
    return Object.values(history)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 5)
      .map((entry) => {
        const video = videos.find((v) => v.id === entry.videoId);
        return video ? { video, positionSeconds: entry.positionSeconds } : null;
      })
      .filter((entry): entry is { video: VideoAsset; positionSeconds: number } => entry !== null);
  }, [history, videos]);

  const handlePress = useCallback(
    (video: VideoAsset) => {
      setQueue(sortedVideos);
      router.push(`/player/${video.id}`);
    },
    [sortedVideos, setQueue, router]
  );

  const handlePickFolder = useCallback(() => {
    pickFolder().catch(() => {});
  }, [pickFolder]);

  return (
    <ThemedView style={styles.container}>
      <FolderPicker
        folderName={folderName}
        scanning={status === 'scanning'}
        onPickFolder={handlePickFolder}
        onRescan={rescan}
      />

      {status === 'scanning' && videos.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <ThemedText style={styles.centerText}>Scanning for videos…</ThemedText>
        </View>
      ) : null}

      {status === 'error' && error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={32} color="#c0392b" />
          <ThemedText style={styles.centerText}>{error}</ThemedText>
        </View>
      ) : null}

      {status === 'idle' && !folderUri ? (
        <View style={styles.center}>
          <Ionicons name="videocam-outline" size={40} color="#5a6672" />
          <ThemedText style={styles.centerText}>Choose a folder to scan for videos.</ThemedText>
        </View>
      ) : null}

      {status === 'ready' && videos.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="videocam-off-outline" size={40} color="#5a6672" />
          <ThemedText style={styles.centerText}>No videos found in this folder.</ThemedText>
        </View>
      ) : null}

      <FlatList
        data={sortedVideos}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        ListHeaderComponent={
          videos.length > 0 ? (
            <>
              <ContinueWatchingRow entries={continueWatching} onPress={handlePress} />
              <SortControl mode={sortMode} onChange={setSortMode} />
            </>
          ) : null
        }
        renderItem={({ item }) => (
          <VideoGridItem video={item} onPress={handlePress} onMeta={updateVideoMeta} />
        )}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  grid: {
    paddingHorizontal: 10,
    paddingBottom: 24,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 8,
    paddingHorizontal: 24,
  },
  centerText: {
    textAlign: 'center',
    opacity: 0.7,
  },
});
