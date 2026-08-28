import { Ionicons } from '@expo/vector-icons';
import { StorageAccessFramework } from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/settings/Card';
import { settingsStyles as styles } from '@/components/settings/settingsStyles';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useLibraryPreferences } from '@/hooks/useLibraryPreferences';
import { useAccentColor } from '@/hooks/useThemePreference';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useVideoLibraryStore } from '@/hooks/useVideoLibrary';
import { spacing } from '@/theme/tokens';
import { displayNameFromUri } from '@/utils/safVideoScan';

// StorageAccessFramework's directory picker is Android-only (there's no iOS
// equivalent in this API — iOS' own document picker uses a different flow
// entirely that this app doesn't wire up), so the "Add custom folder"
// affordance below only makes sense to show there.
const CUSTOM_FOLDERS_SUPPORTED = Platform.OS === 'android';

export default function ScanFoldersSettingsScreen() {
  const insets = useSafeAreaInsets();
  const accentColor = useAccentColor();
  const borderColor = useThemeColor({}, 'surfaceBorder');
  const mutedColor = useThemeColor({}, 'textMuted');

  const scanFolderIds = useLibraryPreferences((s) => s.scanFolderIds);
  const setScanFolderIds = useLibraryPreferences((s) => s.setScanFolderIds);
  const customScanFolders = useLibraryPreferences((s) => s.customScanFolders);
  const addCustomScanFolder = useLibraryPreferences((s) => s.addCustomScanFolder);
  const removeCustomScanFolder = useLibraryPreferences((s) => s.removeCustomScanFolder);
  const rescan = useVideoLibraryStore((s) => s.rescan);

  const [albums, setAlbums] = useState<MediaLibrary.Album[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [addingFolder, setAddingFolder] = useState(false);
  // Set on any toggle/add/remove — gates the rescan-on-leave below so just
  // opening and leaving this screen without touching anything doesn't
  // trigger a pointless rescan.
  const changedRef = useRef(false);

  useEffect(() => {
    MediaLibrary.getAlbumsAsync({ includeSmartAlbums: true })
      .then((result) => {
        setAlbums([...result].sort((a, b) => a.title.localeCompare(b.title)));
      })
      .catch(() => setLoadError(true));
  }, []);

  // Applies the new selection once the user actually leaves, rather than
  // re-scanning after every single toggle/add/remove while they're still
  // picking.
  useEffect(() => {
    return () => {
      if (changedRef.current) {
        rescan();
      }
    };
  }, [rescan]);

  const toggleAlbum = (albumId: string, next: boolean) => {
    changedRef.current = true;
    setScanFolderIds(next ? [...scanFolderIds, albumId] : scanFolderIds.filter((id) => id !== albumId));
  };

  const handleAddCustomFolder = async () => {
    setAddingFolder(true);
    try {
      const result = await StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (!result.granted) {
        return;
      }
      changedRef.current = true;
      addCustomScanFolder({ uri: result.directoryUri, name: displayNameFromUri(result.directoryUri) });
    } catch {
      Alert.alert("Couldn't add folder", 'Please try again.');
    } finally {
      setAddingFolder(false);
    }
  };

  const handleRemoveCustomFolder = (uri: string) => {
    changedRef.current = true;
    removeCustomScanFolder(uri);
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}>
        <ThemedText style={[styles.hint, { color: mutedColor }]}>
          Leave everything unchecked to scan your whole device for videos. Check specific folders, or add
          custom ones below, to only scan those instead.
        </ThemedText>

        <Card>
          {albums === null ? (
            <View style={styles.row}>
              <ActivityIndicator color={accentColor} />
            </View>
          ) : loadError ? (
            <View style={styles.row}>
              <ThemedText style={styles.rowLabel}>Couldn&apos;t load device folders.</ThemedText>
            </View>
          ) : albums.length === 0 ? (
            <View style={styles.row}>
              <ThemedText style={styles.rowLabel}>No folders found on this device.</ThemedText>
            </View>
          ) : (
            albums.map((album, index) => {
              const selected = scanFolderIds.includes(album.id);
              return (
                <View key={album.id}>
                  <View style={styles.row}>
                    <Ionicons name="folder-outline" size={20} color={accentColor} />
                    <View style={styles.rowSpacer}>
                      <ThemedText style={styles.rowLabel} numberOfLines={1}>
                        {album.title}
                      </ThemedText>
                    </View>
                    <Switch
                      value={selected}
                      onValueChange={(next) => toggleAlbum(album.id, next)}
                      trackColor={{ false: 'rgba(128,128,128,0.3)', true: accentColor }}
                      thumbColor="#fff"
                    />
                  </View>
                  {index < albums.length - 1 ? (
                    <View style={[styles.rowDivider, { backgroundColor: borderColor }]} />
                  ) : null}
                </View>
              );
            })
          )}
        </Card>

        {CUSTOM_FOLDERS_SUPPORTED ? (
          <>
            <ThemedText style={[styles.hint, { color: mutedColor }]}>
              Custom folders — pick any folder directly, including ones not listed above. Subfolders are
              included automatically.
            </ThemedText>

            <Card>
              {customScanFolders.map((folder, index) => (
                <View key={folder.uri}>
                  <View style={styles.row}>
                    <Ionicons name="folder-open-outline" size={20} color={accentColor} />
                    <View style={styles.rowSpacer}>
                      <ThemedText style={styles.rowLabel} numberOfLines={1}>
                        {folder.name}
                      </ThemedText>
                    </View>
                    <Pressable onPress={() => handleRemoveCustomFolder(folder.uri)} hitSlop={12}>
                      <Ionicons name="trash-outline" size={20} color={mutedColor} />
                    </Pressable>
                  </View>
                  <View style={[styles.rowDivider, { backgroundColor: borderColor }]} />
                </View>
              ))}

              <Pressable style={styles.row} onPress={handleAddCustomFolder} disabled={addingFolder}>
                {addingFolder ? (
                  <ActivityIndicator color={accentColor} />
                ) : (
                  <Ionicons name="add-circle-outline" size={20} color={accentColor} />
                )}
                <ThemedText style={[styles.rowLabel, { color: accentColor }]}>Add custom folder</ThemedText>
              </Pressable>
            </Card>
          </>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}
