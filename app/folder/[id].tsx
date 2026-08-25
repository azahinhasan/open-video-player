import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { ActionMenu, type ActionMenuOption } from '@/components/library/ActionMenu';
import { DeleteConfirmSheet } from '@/components/library/DeleteConfirmSheet';
import { PropertiesSheet, type PropertyRow } from '@/components/library/PropertiesSheet';
import { SortControl } from '@/components/library/SortControl';
import { VideoGridItem } from '@/components/library/VideoGridItem';
import { VideoListItem } from '@/components/library/VideoListItem';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useSortPreference, type SortMode } from '@/hooks/useSortPreference';
import { usePlaybackStore } from '@/hooks/usePlaybackStore';
import { useAccentColor } from '@/hooks/useThemePreference';
import { useThemeColor } from '@/hooks/use-theme-color';
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
  const sortMode = useSortPreference((s) => s.sortMode);
  const setSortMode = useSortPreference((s) => s.setSortMode);
  const accentColor = useAccentColor();
  const mutedColor = useThemeColor({}, 'textMuted');
  const dangerColor = useThemeColor({}, 'danger');
  const router = useRouter();
  const [actionMenuVideo, setActionMenuVideo] = useState<VideoAsset | null>(null);
  const [propertiesVideo, setPropertiesVideo] = useState<VideoAsset | null>(null);
  const [deleteVideo, setDeleteVideo] = useState<VideoAsset | null>(null);
  const [batchDeleteVisible, setBatchDeleteVisible] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const folder = folders.find((f) => f.id === id);
  const videos = useMemo(() => sortVideos(videosForFolder(id), sortMode), [videosForFolder, id, sortMode]);

  const handlePress = useCallback(
    (video: VideoAsset) => {
      setQueue(videos);
      router.push(`/player/${video.id}`);
    },
    [videos, setQueue, router]
  );

  const enterSelectMode = useCallback((video: VideoAsset | null) => {
    setSelectMode(true);
    setSelectedIds(video ? new Set([video.id]) : new Set());
  }, []);

  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  const toggleSelect = useCallback((video: VideoAsset) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(video.id)) {
        next.delete(video.id);
      } else {
        next.add(video.id);
      }
      return next;
    });
  }, []);

  const allSelected = videos.length > 0 && selectedIds.size === videos.length;
  const handleSelectAll = useCallback(() => {
    setSelectedIds(allSelected ? new Set() : new Set(videos.map((v) => v.id)));
  }, [allSelected, videos]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteVideo) {
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setDeleteVideo(null);
    const success = await deleteVideos([deleteVideo.id]);
    if (!success) {
      Alert.alert("Couldn't delete", 'The video was not deleted. Please try again.');
    }
  }, [deleteVideo, deleteVideos]);

  const handleConfirmBatchDelete = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setBatchDeleteVisible(false);
    const success = await deleteVideos(ids);
    if (success) {
      exitSelectMode();
    } else {
      Alert.alert("Couldn't delete", 'Some videos were not deleted. Please try again.');
    }
  }, [selectedIds, deleteVideos, exitSelectMode]);

  const actionMenuOptions: ActionMenuOption[] = actionMenuVideo
    ? [
        {
          key: 'select',
          label: 'Select',
          icon: 'checkmark-circle-outline',
          onPress: () => enterSelectMode(actionMenuVideo),
        },
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
          onPress: () => setDeleteVideo(actionMenuVideo),
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

  const batchDeleteFirstVideo = useMemo(
    () => videos.find((v) => selectedIds.has(v.id)) ?? null,
    [videos, selectedIds]
  );

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: selectMode ? `${selectedIds.size} selected` : (folder?.name ?? 'Videos'),
          headerLeft: selectMode
            ? () => (
                <Pressable onPress={exitSelectMode} hitSlop={12}>
                  <Ionicons name="close" size={22} color={accentColor} />
                </Pressable>
              )
            : undefined,
          headerRight: () =>
            selectMode ? (
              <View style={styles.headerActions}>
                <Pressable onPress={handleSelectAll} hitSlop={12}>
                  <Ionicons
                    name={allSelected ? 'checkbox' : 'checkbox-outline'}
                    size={22}
                    color={accentColor}
                  />
                </Pressable>
                <Pressable
                  onPress={() => setBatchDeleteVisible(true)}
                  hitSlop={12}
                  disabled={selectedIds.size === 0}>
                  <Ionicons
                    name="trash-outline"
                    size={22}
                    color={selectedIds.size === 0 ? mutedColor : dangerColor}
                  />
                </Pressable>
              </View>
            ) : (
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
              selectable={selectMode}
              selected={selectedIds.has(item.id)}
              onToggleSelect={toggleSelect}
            />
          ) : (
            <VideoListItem
              video={item}
              onPress={handlePress}
              onLongPress={setActionMenuVideo}
              onMeta={updateVideoMeta}
              selectable={selectMode}
              selected={selectedIds.has(item.id)}
              onToggleSelect={toggleSelect}
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

      <DeleteConfirmSheet
        visible={deleteVideo !== null}
        title={deleteVideo?.filename ?? ''}
        thumbnailUri={deleteVideo?.thumbnailUri}
        onCancel={() => setDeleteVideo(null)}
        onConfirm={handleConfirmDelete}
      />

      <DeleteConfirmSheet
        visible={batchDeleteVisible}
        title={`${selectedIds.size} video${selectedIds.size === 1 ? '' : 's'} selected`}
        subtitle={
          selectedIds.size > 1 && batchDeleteFirstVideo
            ? `${batchDeleteFirstVideo.filename} and ${selectedIds.size - 1} more`
            : (batchDeleteFirstVideo?.filename ?? undefined)
        }
        thumbnailUri={batchDeleteFirstVideo?.thumbnailUri}
        onCancel={() => setBatchDeleteVisible(false)}
        onConfirm={handleConfirmBatchDelete}
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
});
