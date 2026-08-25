import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { VideoListItem } from '@/components/library/VideoListItem';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { usePlaybackStore } from '@/hooks/usePlaybackStore';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useVideoLibrary } from '@/hooks/useVideoLibrary';
import { radius, spacing, typography } from '@/theme/tokens';
import type { VideoAsset } from '@/types/video';

export default function SearchScreen() {
  const { videos, updateVideoMeta } = useVideoLibrary();
  const setQueue = usePlaybackStore((s) => s.setQueue);
  const router = useRouter();
  const surfaceColor = useThemeColor({}, 'surface');
  const borderColor = useThemeColor({}, 'surfaceBorder');
  const mutedColor = useThemeColor({}, 'textMuted');
  const textColor = useThemeColor({}, 'text');
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return [];
    }
    return videos.filter((video) => video.filename.toLowerCase().includes(trimmed));
  }, [videos, query]);

  const handlePress = useCallback(
    (video: VideoAsset) => {
      setQueue(results);
      router.push(`/player/${video.id}`);
    },
    [results, setQueue, router]
  );

  const trimmedQuery = query.trim();

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.searchBar, { backgroundColor: surfaceColor, borderColor }]}>
        <Ionicons name="search-outline" size={18} color={mutedColor} />
        <TextInput
          style={[styles.input, { color: textColor }]}
          placeholder="Search videos"
          placeholderTextColor={mutedColor}
          value={query}
          onChangeText={setQuery}
          autoFocus
          returnKeyType="search"
        />
        {query.length > 0 ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={mutedColor} />
          </Pressable>
        ) : null}
      </View>

      {trimmedQuery.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="search-outline" size={32} color={mutedColor} />
          <ThemedText style={styles.centerText}>Search videos by filename across every folder</ThemedText>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.center}>
          <ThemedText style={styles.centerText}>No videos match &quot;{trimmedQuery}&quot;</ThemedText>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <VideoListItem video={item} onPress={handlePress} onMeta={updateVideoMeta} />
          )}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    fontSize: typography.size.body,
    padding: 0,
  },
  list: {
    paddingBottom: 24,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  centerText: {
    textAlign: 'center',
    opacity: 0.7,
  },
});
