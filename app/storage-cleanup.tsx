import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { SegmentedControl } from '@/components/settings/SegmentedControl';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useVideoLibrary } from '@/hooks/useVideoLibrary';
import { radius, spacing, typography } from '@/theme/tokens';
import type { VideoAsset } from '@/types/video';
import { formatDate, formatFileSize, getFileSize } from '@/utils/videoProperties';

type CleanupTab = 'largest' | 'oldest';

const TAB_OPTIONS: { value: CleanupTab; label: string }[] = [
  { value: 'largest', label: 'Largest' },
  { value: 'oldest', label: 'Oldest' },
];

type SizedVideo = VideoAsset & { size: number | null };

export default function StorageCleanupScreen() {
  const { videos, deleteVideos } = useVideoLibrary();
  const surfaceColor = useThemeColor({}, 'surface');
  const borderColor = useThemeColor({}, 'surfaceBorder');
  const mutedColor = useThemeColor({}, 'textMuted');
  const dangerColor = useThemeColor({}, 'danger');
  const [tab, setTab] = useState<CleanupTab>('largest');

  const sized = useMemo<SizedVideo[]>(
    () => videos.map((video) => ({ ...video, size: getFileSize(video.uri) })),
    [videos]
  );

  const totalSize = useMemo(() => sized.reduce((sum, v) => sum + (v.size ?? 0), 0), [sized]);

  const rows = useMemo(() => {
    const copy = [...sized];
    if (tab === 'largest') {
      copy.sort((a, b) => (b.size ?? 0) - (a.size ?? 0));
    } else {
      copy.sort((a, b) => (a.creationTime ?? Infinity) - (b.creationTime ?? Infinity));
    }
    return copy.slice(0, 30);
  }, [sized, tab]);

  const handleDelete = (video: SizedVideo) => {
    Alert.alert('Delete video?', `"${video.filename}" will be permanently deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          const success = await deleteVideos([video.id]);
          if (!success) {
            Alert.alert("Couldn't delete", 'The video was not deleted. Please try again.');
          }
        },
      },
    ]);
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.statsBlock}>
        <ThemedText style={styles.statsValue}>{formatFileSize(totalSize)}</ThemedText>
        <ThemedText style={styles.statsLabel}>
          across {videos.length} video{videos.length === 1 ? '' : 's'}
        </ThemedText>
      </View>

      <View style={styles.tabWrap}>
        <SegmentedControl options={TAB_OPTIONS} value={tab} onChange={setTab} />
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<ThemedText style={styles.empty}>No videos found.</ThemedText>}
        renderItem={({ item }) => (
          <View style={[styles.row, { backgroundColor: surfaceColor, borderColor }]}>
            <View style={styles.thumbnailWrap}>
              {item.thumbnailUri ? (
                <Image source={{ uri: item.thumbnailUri }} style={styles.thumbnail} contentFit="cover" />
              ) : (
                <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
                  <Ionicons name="film-outline" size={20} color={mutedColor} />
                </View>
              )}
            </View>
            <View style={styles.rowInfo}>
              <ThemedText numberOfLines={1} style={styles.filename}>
                {item.filename}
              </ThemedText>
              <ThemedText style={[styles.meta, { color: mutedColor }]}>
                {tab === 'largest'
                  ? `${item.size !== null ? formatFileSize(item.size) : 'Unknown size'} · ${formatDate(item.creationTime)}`
                  : `${formatDate(item.creationTime)} · ${item.size !== null ? formatFileSize(item.size) : 'Unknown size'}`}
              </ThemedText>
            </View>
            <Pressable onPress={() => handleDelete(item)} hitSlop={10}>
              <Ionicons name="trash-outline" size={20} color={dangerColor} />
            </Pressable>
          </View>
        )}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: spacing.lg,
  },
  statsBlock: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  statsValue: {
    fontSize: typography.size.title,
    fontWeight: typography.weight.medium,
  },
  statsLabel: {
    fontSize: typography.size.meta,
    opacity: 0.6,
    marginTop: 2,
  },
  tabWrap: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 24,
  },
  empty: {
    textAlign: 'center',
    opacity: 0.7,
    marginTop: 48,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.sm,
  },
  thumbnailWrap: {
    width: 64,
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
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  filename: {
    fontSize: typography.size.body,
  },
  meta: {
    fontSize: typography.size.micro,
  },
});
