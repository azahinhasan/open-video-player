import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet } from 'react-native';

import { ActionMenu, type ActionMenuOption } from '@/components/library/ActionMenu';
import { PropertiesSheet, type PropertyRow } from '@/components/library/PropertiesSheet';
import { SortControl, type SortMode } from '@/components/library/SortControl';
import { VideoGridItem } from '@/components/library/VideoGridItem';
import { VideoListItem } from '@/components/library/VideoListItem';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { usePlaybackStore } from '@/hooks/usePlaybackStore';
import { useAccentColor } from '@/hooks/useThemePreference';
import { useVideoLibrary } from '@/hooks/useVideoLibrary';
import { useViewMode } from '@/hooks/useViewMode';
import type { VideoAsset } from '@/types/video';
import { formatTime } from '@/utils/formatTime';
import { formatDate, formatFileSize, getFileDirectory, getFileSize } from '@/utils/videoProperties';

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

export default function FolderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { folders, videosForFolder, updateVideoMeta, deleteVideos, status, rescan } = useVideoLibrary();
  const setQueue = usePlaybackStore((s) => s.setQueue);
  const { viewMode, toggleViewMode } = useViewMode();
  const accentColor = useAccentColor();
  const router = useRouter();
  const [sortMode, setSortMode] = useState<SortMode>('name');
  const [actionMenuVideo, setActionMenuVideo] = useState<VideoAsset | null>(null);
  const [propertiesVideo, setPropertiesVideo] = useState<VideoAsset | null>(null);

  const folder = folders.find((f) => f.id === id);
  const videos = useMemo(() => sortVideos(videosForFolder(id), sortMode), [videosForFolder, id, sortMode]);

  const handlePress = useCallback(
    (video: VideoAsset) => {
      setQueue(videos);
      router.push(`/player/${video.id}`);
    },
    [videos, setQueue, router]
  );

  const handleDelete = useCallback(
    (video: VideoAsset) => {
      Alert.alert('Delete video?', `"${video.filename}" will be permanently deleted.`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteVideos([video.id]);
            if (!success) {
              Alert.alert("Couldn't delete", 'The video was not deleted. Please try again.');
            }
          },
        },
      ]);
    },
    [deleteVideos]
  );

  const actionMenuOptions: ActionMenuOption[] = actionMenuVideo
    ? [
        {
          key: 'properties',
          label: 'Properties',
          icon: 'information-circle-outline',
          onPress: () => setPropertiesVideo(actionMenuVideo),
        },
        {
          key: 'delete',
          label: 'Delete',
          icon: 'trash-outline',
          destructive: true,
          onPress: () => handleDelete(actionMenuVideo),
        },
      ]
    : [];

  const propertyRows: PropertyRow[] = useMemo(() => {
    if (!propertiesVideo) {
      return [];
    }
    const size = getFileSize(propertiesVideo.uri);
    return [
      { label: 'Filename', value: propertiesVideo.filename },
      { label: 'Folder', value: folder?.name ?? 'Unknown' },
      {
        label: 'Duration',
        value: propertiesVideo.duration !== null ? formatTime(propertiesVideo.duration) : 'Unknown',
      },
      {
        label: 'Resolution',
        value:
          propertiesVideo.width && propertiesVideo.height
            ? `${propertiesVideo.width} × ${propertiesVideo.height}`
            : 'Unknown',
      },
      { label: 'Size', value: size !== null ? formatFileSize(size) : 'Unknown' },
      { label: 'Location', value: getFileDirectory(propertiesVideo.uri) },
      { label: 'Date added', value: formatDate(propertiesVideo.creationTime) },
      { label: 'Last modified', value: formatDate(propertiesVideo.modificationTime) },
    ];
  }, [propertiesVideo, folder]);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: folder?.name ?? 'Videos',
          headerRight: () => (
            <Pressable onPress={toggleViewMode} hitSlop={12}>
              <Ionicons
                name={viewMode === 'grid' ? 'list-outline' : 'grid-outline'}
                size={22}
                color={accentColor}
              />
            </Pressable>
          ),
        }}
      />

      {videos.length === 0 ? (
        <ThemedText style={styles.empty}>No videos in this folder.</ThemedText>
      ) : null}

      <FlatList
        key={viewMode}
        data={videos}
        keyExtractor={(item) => item.id}
        numColumns={viewMode === 'grid' ? 2 : 1}
        contentContainerStyle={viewMode === 'grid' ? styles.grid : styles.list}
        refreshControl={
          <RefreshControl
            refreshing={status === 'scanning'}
            onRefresh={rescan}
            tintColor={accentColor}
            colors={[accentColor]}
          />
        }
        ListHeaderComponent={<SortControl mode={sortMode} onChange={setSortMode} />}
        renderItem={({ item }) =>
          viewMode === 'grid' ? (
            <VideoGridItem
              video={item}
              onPress={handlePress}
              onLongPress={setActionMenuVideo}
              onMeta={updateVideoMeta}
            />
          ) : (
            <VideoListItem
              video={item}
              onPress={handlePress}
              onLongPress={setActionMenuVideo}
              onMeta={updateVideoMeta}
            />
          )
        }
      />

      <ActionMenu
        visible={actionMenuVideo !== null}
        title={actionMenuVideo?.filename ?? ''}
        options={actionMenuOptions}
        onClose={() => setActionMenuVideo(null)}
      />

      <PropertiesSheet
        visible={propertiesVideo !== null}
        title="Video properties"
        rows={propertyRows}
        onClose={() => setPropertiesVideo(null)}
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
  list: {
    paddingBottom: 24,
  },
  empty: {
    textAlign: 'center',
    opacity: 0.7,
    marginTop: 48,
  },
});
