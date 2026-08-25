import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

type FolderPickerProps = {
  folderName: string | null;
  scanning: boolean;
  onPickFolder: () => void;
  onRescan: () => void;
};

export function FolderPicker({ folderName, scanning, onPickFolder, onRescan }: FolderPickerProps) {
  return (
    <View style={styles.row}>
      <Pressable style={styles.pickButton} onPress={onPickFolder} disabled={scanning}>
        <Ionicons name="folder-open-outline" size={18} color="#fff" />
        <ThemedText style={styles.pickButtonText} numberOfLines={1}>
          {folderName ?? 'Choose folder'}
        </ThemedText>
      </Pressable>
      {folderName ? (
        <Pressable style={styles.iconButton} onPress={onRescan} disabled={scanning} hitSlop={8}>
          <Ionicons name="refresh" size={20} color={scanning ? '#888' : '#F97316'} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pickButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F97316',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  pickButtonText: {
    color: '#fff',
    fontWeight: '600',
    flexShrink: 1,
  },
  iconButton: {
    padding: 10,
  },
});
