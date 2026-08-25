import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { ActionMenu, type ActionMenuOption } from '@/components/library/ActionMenu';
import { DeleteConfirmSheet } from '@/components/library/DeleteConfirmSheet';
import { FolderListItem } from '@/components/library/FolderListItem';
import { PermissionGate } from '@/components/library/PermissionGate';
import { PropertiesSheet, type PropertyRow } from '@/components/library/PropertiesSheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAccentColor } from '@/hooks/useThemePreference';
import { useVideoLibrary } from '@/hooks/useVideoLibrary';
import type { VideoFolder } from '@/types/video';
import { formatTime } from '@/utils/formatTime';

export default function LibraryScreen() {
  const {
    videos,
    folders,
    videosForFolder,
    status,
    backgroundScanning,
    error,
    canAskAgain,
    requestAccess,
    rescan,
    deleteVideos,
  } = useVideoLibrary();
  const accentColor = useAccentColor();
  const router = useRouter();
  const [actionMenuFolder, setActionMenuFolder] = useState<VideoFolder | null>(null);
  const [propertiesFolder, setPropertiesFolder] = useState<VideoFolder | null>(null);
  const [deleteFolder, setDeleteFolder] = useState<VideoFolder | null>(null);

  const handleOpenFolder = useCallback(
    (folder: VideoFolder) => {
      router.push(`/folder/${folder.id}`);
    },
    [router]
  );

  const handleConfirmDeleteFolder = useCallback(async () => {
    if (!deleteFolder) {
      return;
    }
    const folderVideos = videosForFolder(deleteFolder.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setDeleteFolder(null);
    const success = await deleteVideos(folderVideos.map((v) => v.id));
    if (!success) {
      Alert.alert("Couldn't delete", 'The folder was not fully deleted. Please try again.');
    }
  }, [deleteFolder, videosForFolder, deleteVideos]);

  const actionMenuOptions: ActionMenuOption[] = actionMenuFolder
    ? [
        {
          key: 'properties',
          label: 'Properties',
          icon: 'information-circle-outline',
          onPress: () => setPropertiesFolder(actionMenuFolder),
        },
        {
          key: 'delete',
          label: 'Delete all videos',
          icon: 'trash-outline',
          destructive: true,
          onPress: () => setDeleteFolder(actionMenuFolder),
        },
      ]
    : [];

  const deleteFolderVideoCount = deleteFolder ? videosForFolder(deleteFolder.id).length : 0;

  const propertyRows: PropertyRow[] = useMemo(() => {
    if (!propertiesFolder) {
      return [];
    }
    const folderVideos = videosForFolder(propertiesFolder.id);
    const totalDuration = folderVideos.reduce((sum, v) => sum + (v.duration ?? 0), 0);
    return [
      { label: 'Name', value: propertiesFolder.name },
      { label: 'Videos', value: String(propertiesFolder.videoCount) },
      { label: 'Total duration', value: formatTime(totalDuration) },
    ];
  }, [propertiesFolder, videosForFolder]);

  const settingsButton = (
    <Stack.Screen
      options={{
        headerRight: () => (
          <View style={styles.headerActions}>
            {backgroundScanning ? (
              <ActivityIndicator size="small" color={accentColor} />
            ) : null}
            <Pressable onPress={() => router.push('/search')} hitSlop={12}>
              <Ionicons name="search-outline" size={22} color={accentColor} />
            </Pressable>
            <Pressable onPress={() => router.push('/settings')} hitSlop={12}>
              <Ionicons name="settings-outline" size={22} color={accentColor} />
            </Pressable>
          </View>
        ),
      }}
    />
  );

  if (status === 'needs-permission' || status === 'denied' || (status === 'error' && videos.length === 0)) {
    return (
      <ThemedView style={styles.container}>
        {settingsButton}
        <PermissionGate
          status={status === 'error' ? 'error' : status}
          canAskAgain={canAskAgain}
          errorMessage={error}
          onRequestAccess={requestAccess}
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {settingsButton}
      {(status === 'checking-permission' || status === 'scanning') && videos.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <ThemedText style={styles.centerText}>Scanning your device for videos…</ThemedText>
        </View>
      ) : null}

      {status === 'ready' && folders.length === 0 ? (
        <View style={styles.center}>
          <ThemedText style={styles.centerText}>No videos found on this device.</ThemedText>
        </View>
      ) : null}

      <FlatList
        data={folders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={status === 'scanning'}
            onRefresh={rescan}
            tintColor={accentColor}
            colors={[accentColor]}
          />
        }
        renderItem={({ item }) => (
          <FolderListItem folder={item} onPress={handleOpenFolder} onLongPress={setActionMenuFolder} />
        )}
      />

      <ActionMenu
        visible={actionMenuFolder !== null}
        title={actionMenuFolder?.name ?? ''}
        options={actionMenuOptions}
        onClose={() => setActionMenuFolder(null)}
      />

      <PropertiesSheet
        visible={propertiesFolder !== null}
        title="Folder properties"
        rows={propertyRows}
        onClose={() => setPropertiesFolder(null)}
      />

      <DeleteConfirmSheet
        visible={deleteFolder !== null}
        title={deleteFolder?.name ?? ''}
        subtitle={`${deleteFolderVideoCount} video${deleteFolderVideoCount === 1 ? '' : 's'}`}
        thumbnailUri={deleteFolder?.thumbnailUri}
        confirmLabel="Delete all"
        onCancel={() => setDeleteFolder(null)}
        onConfirm={handleConfirmDeleteFolder}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
});
