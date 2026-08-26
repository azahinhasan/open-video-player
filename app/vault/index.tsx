import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ActionMenu, type ActionMenuOption } from '@/components/library/ActionMenu';
import { DeleteConfirmSheet } from '@/components/library/DeleteConfirmSheet';
import { PropertiesSheet, type PropertyRow } from '@/components/library/PropertiesSheet';
import { VideoGridItem } from '@/components/library/VideoGridItem';
import { VideoListItem } from '@/components/library/VideoListItem';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { usePlaybackStore } from '@/hooks/usePlaybackStore';
import { useAccentColor } from '@/hooks/useThemePreference';
import { useVaultAuthStore } from '@/hooks/useVaultAuthStore';
import { useVaultStore } from '@/hooks/useVaultStore';
import { useViewMode } from '@/hooks/useViewMode';
import type { VideoAsset } from '@/types/video';
import { formatTime } from '@/utils/formatTime';
import { vaultEntryToVideoAsset } from '@/utils/vaultEntryAdapter';
import { formatDate, formatFileSize } from '@/utils/videoProperties';

// Vault entries are immutable snapshots taken at vault-time (see
// utils/vaultStorage.ts's moveToVault) — there's nothing for VideoGridItem/
// VideoListItem's own "generate thumbnail if missing" effect to write back.
const noopMeta = () => {};

export default function VaultScreen() {
  const { entries, unvaultEntry, unvaultEntries, deleteEntries } = useVaultStore();
  const lock = useVaultAuthStore((s) => s.lock);
  const setQueue = usePlaybackStore((s) => s.setQueue);
  const { viewMode, toggleViewMode } = useViewMode();
  const accentColor = useAccentColor();
  const mutedColor = useThemeColor({}, 'textMuted');
  const router = useRouter();

  const [actionMenuVideo, setActionMenuVideo] = useState<VideoAsset | null>(null);
  const [propertiesVideo, setPropertiesVideo] = useState<VideoAsset | null>(null);
  const [unvaultVideo, setUnvaultVideo] = useState<VideoAsset | null>(null);
  const [deleteVideo, setDeleteVideo] = useState<VideoAsset | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchUnvaultVisible, setBatchUnvaultVisible] = useState(false);
  const [batchDeleteVisible, setBatchDeleteVisible] = useState(false);

  const videos = useMemo(() => entries.map(vaultEntryToVideoAsset), [entries]);
  const entryById = useMemo(() => new Map(entries.map((e) => [e.id, e])), [entries]);

  const handlePress = useCallback(
    (video: VideoAsset) => {
      setQueue(videos);
      router.push(`/vault/player/${video.id}`);
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

  const handleConfirmUnvault = useCallback(async () => {
    if (!unvaultVideo) {
      return;
    }
    const entry = entryById.get(unvaultVideo.id);
    if (!entry) {
      setUnvaultVideo(null);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setUnvaultVideo(null);
    const success = await unvaultEntry(entry);
    if (!success) {
      Alert.alert("Couldn't remove from vault", 'The video was not restored. Please try again.');
    }
  }, [unvaultVideo, entryById, unvaultEntry]);

  const handleConfirmDelete = useCallback(() => {
    if (!deleteVideo) {
      return;
    }
    const entry = entryById.get(deleteVideo.id);
    if (!entry) {
      setDeleteVideo(null);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setDeleteVideo(null);
    deleteEntries([entry]);
  }, [deleteVideo, entryById, deleteEntries]);

  const handleConfirmBatchUnvault = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setBatchUnvaultVisible(false);
    const selectedEntries = ids.map((id) => entryById.get(id)).filter((e): e is NonNullable<typeof e> => !!e);
    const { failedCount } = await unvaultEntries(selectedEntries);
    exitSelectMode();
    if (failedCount > 0) {
      Alert.alert(
        "Couldn't remove all from vault",
        `${failedCount} video${failedCount === 1 ? '' : 's'} could not be restored.`
      );
    }
  }, [selectedIds, entryById, unvaultEntries, exitSelectMode]);

  const handleConfirmBatchDelete = useCallback(() => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setBatchDeleteVisible(false);
    const selectedEntries = ids.map((id) => entryById.get(id)).filter((e): e is NonNullable<typeof e> => !!e);
    deleteEntries(selectedEntries);
    exitSelectMode();
  }, [selectedIds, entryById, deleteEntries, exitSelectMode]);

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
          key: 'unvault',
          label: 'Remove from Vault',
          icon: 'lock-open-outline',
          onPress: () => setUnvaultVideo(actionMenuVideo),
        },
        {
          key: 'delete',
          label: 'Delete permanently',
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
    const entry = entryById.get(propertiesVideo.id);
    return [
      { label: 'Filename', value: propertiesVideo.filename },
      { label: 'Original folder', value: entry?.originalFolder ?? 'Unknown' },
      {
        label: 'Duration',
        value: propertiesVideo.duration !== null ? formatTime(propertiesVideo.duration) : 'Unknown',
      },
      { label: 'Size', value: entry ? formatFileSize(entry.sizeBytes) : 'Unknown' },
      { label: 'Vaulted', value: entry ? formatDate(Date.parse(entry.dateVaulted)) : 'Unknown' },
    ];
  }, [propertiesVideo, entryById]);

  const batchFirstVideo = useMemo(
    () => videos.find((v) => selectedIds.has(v.id)) ?? null,
    [videos, selectedIds]
  );

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: selectMode ? `${selectedIds.size} selected` : 'Vault',
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
                  onPress={() => setBatchUnvaultVisible(true)}
                  hitSlop={12}
                  disabled={selectedIds.size === 0}>
                  <Ionicons
                    name="lock-open-outline"
                    size={22}
                    color={selectedIds.size === 0 ? mutedColor : accentColor}
                  />
                </Pressable>
                <Pressable
                  onPress={() => setBatchDeleteVisible(true)}
                  hitSlop={12}
                  disabled={selectedIds.size === 0}>
                  <Ionicons
                    name="trash-outline"
                    size={22}
                    color={selectedIds.size === 0 ? mutedColor : accentColor}
                  />
                </Pressable>
              </View>
            ) : (
              <View style={styles.headerActions}>
                <Pressable onPress={toggleViewMode} hitSlop={12}>
                  <Ionicons
                    name={viewMode === 'grid' ? 'list-outline' : 'grid-outline'}
                    size={22}
                    color={accentColor}
                  />
                </Pressable>
                <Pressable onPress={lock} hitSlop={12}>
                  <Ionicons name="lock-closed-outline" size={22} color={accentColor} />
                </Pressable>
              </View>
            ),
        }}
      />

      {videos.length === 0 ? <ThemedText style={styles.empty}>Nothing in the vault yet.</ThemedText> : null}

      <FlatList
        key={viewMode}
        data={videos}
        keyExtractor={(item) => item.id}
        numColumns={viewMode === 'grid' ? 2 : 1}
        contentContainerStyle={viewMode === 'grid' ? styles.grid : styles.list}
        renderItem={({ item }) =>
          viewMode === 'grid' ? (
            <VideoGridItem
              video={item}
              onPress={handlePress}
              onLongPress={setActionMenuVideo}
              onMeta={noopMeta}
              selectable={selectMode}
              selected={selectedIds.has(item.id)}
              onToggleSelect={toggleSelect}
            />
          ) : (
            <VideoListItem
              video={item}
              onPress={handlePress}
              onLongPress={setActionMenuVideo}
              onMeta={noopMeta}
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
        visible={unvaultVideo !== null}
        title={unvaultVideo?.filename ?? ''}
        thumbnailUri={unvaultVideo?.thumbnailUri}
        confirmLabel="Remove from Vault"
        warningText="This copies the file back to shared storage — visible again in your gallery and other apps."
        onCancel={() => setUnvaultVideo(null)}
        onConfirm={handleConfirmUnvault}
      />

      <DeleteConfirmSheet
        visible={deleteVideo !== null}
        title={deleteVideo?.filename ?? ''}
        thumbnailUri={deleteVideo?.thumbnailUri}
        confirmLabel="Delete permanently"
        warningText="This permanently deletes the video from your Vault. It is not saved anywhere else."
        onCancel={() => setDeleteVideo(null)}
        onConfirm={handleConfirmDelete}
      />

      <DeleteConfirmSheet
        visible={batchUnvaultVisible}
        title={`${selectedIds.size} video${selectedIds.size === 1 ? '' : 's'} selected`}
        subtitle={
          selectedIds.size > 1 && batchFirstVideo
            ? `${batchFirstVideo.filename} and ${selectedIds.size - 1} more`
            : (batchFirstVideo?.filename ?? undefined)
        }
        thumbnailUri={batchFirstVideo?.thumbnailUri}
        confirmLabel="Remove from Vault"
        warningText="These files are copied back to shared storage — visible again in your gallery and other apps."
        onCancel={() => setBatchUnvaultVisible(false)}
        onConfirm={handleConfirmBatchUnvault}
      />

      <DeleteConfirmSheet
        visible={batchDeleteVisible}
        title={`${selectedIds.size} video${selectedIds.size === 1 ? '' : 's'} selected`}
        subtitle={
          selectedIds.size > 1 && batchFirstVideo
            ? `${batchFirstVideo.filename} and ${selectedIds.size - 1} more`
            : (batchFirstVideo?.filename ?? undefined)
        }
        thumbnailUri={batchFirstVideo?.thumbnailUri}
        confirmLabel="Delete permanently"
        warningText="These videos are permanently deleted from your Vault. They are not saved anywhere else."
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
