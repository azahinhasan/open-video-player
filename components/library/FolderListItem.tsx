import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { useAccentColor } from '@/hooks/useThemePreference';
import type { VideoFolder } from '@/types/video';

type FolderListItemProps = {
  folder: VideoFolder;
  onPress: (folder: VideoFolder) => void;
  onLongPress?: (folder: VideoFolder) => void;
};

export function FolderListItem({ folder, onPress, onLongPress }: FolderListItemProps) {
  const accentColor = useAccentColor();

  return (
    <Animated.View entering={FadeIn} exiting={FadeOut.duration(200)} layout={LinearTransition.duration(220)}>
      <Pressable
        style={styles.row}
        onPress={() => onPress(folder)}
        onLongPress={onLongPress ? () => onLongPress(folder) : undefined}>
        <View style={styles.iconWrap}>
          {folder.thumbnailUri ? (
            <Image source={{ uri: folder.thumbnailUri }} style={styles.thumbnail} contentFit="cover" />
          ) : (
            <Ionicons name="folder-outline" size={26} color={accentColor} />
          )}
        </View>
        <View style={styles.textWrap}>
          <ThemedText numberOfLines={1} style={styles.name}>
            {folder.name}
          </ThemedText>
          <ThemedText style={styles.count}>
            {folder.videoCount} {folder.videoCount === 1 ? 'video' : 'videos'}
          </ThemedText>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#888" />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: 'rgba(128,128,128,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  textWrap: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
  },
  count: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
  },
});
