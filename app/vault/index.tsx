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
  const { entries, unvaultEntry } = useVaultStore();
  const lock = useVaultAuthStore((s) => s.lock);
  const setQueue = usePlaybackStore((s) => s.setQueue);
  const { viewMode, toggleViewMode } = useViewMode();
  const accentColor = useAccentColor();
  const router = useRouter();

  const [actionMenuVideo, setActionMenuVideo] = useState<VideoAsset | null>(null);
  const [propertiesVideo, setPropertiesVideo] = useState<VideoAsset | null>(null);
  const [unvaultVideo, setUnvaultVideo] = useState<VideoAsset | null>(null);

  const videos = useMemo(() => entries.map(vaultEntryToVideoAsset), [entries]);
  const entryById = useMemo(() => new Map(entries.map((e) => [e.id, e])), [entries]);

  const handlePress = useCallback(
    (video: VideoAsset) => {
      setQueue(videos);
      router.push(`/vault/player/${video.id}`);
    },
    [videos, setQueue, router]
  );

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

  const actionMenuOptions: ActionMenuOption[] = actionMenuVideo
    ? [
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

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Vault',
          headerRight: () => (
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
            <VideoGridItem video={item} onPress={handlePress} onLongPress={setActionMenuVideo} onMeta={noopMeta} />
          ) : (
            <VideoListItem video={item} onPress={handlePress} onLongPress={setActionMenuVideo} onMeta={noopMeta} />
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
        tone="accent"
        confirmLabel="Remove from Vault"
        warningText="This copies the file back to shared storage — visible again in your gallery and other apps."
        onCancel={() => setUnvaultVideo(null)}
        onConfirm={handleConfirmUnvault}
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
