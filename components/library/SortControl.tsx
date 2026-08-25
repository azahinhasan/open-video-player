import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useAccentColor } from '@/hooks/useThemePreference';
import type { SortMode } from '@/utils/sortPreference';

export type { SortMode };

type SortControlProps = {
  mode: SortMode;
  onChange: (mode: SortMode) => void;
  /**
   * Horizontal padding, in points. Defaults to 16 to match the list view's
   * own row padding. The grid view already adds 10px of its own container
   * padding plus each card's 6px margin (16px total) — pass 6 there so this
   * doesn't stack on top and push the pills further right than the thumbnails.
   */
  edgeInset?: number;
};

const OPTIONS: { mode: SortMode; label: string }[] = [
  { mode: 'name', label: 'Name' },
  { mode: 'date', label: 'Date added' },
  { mode: 'duration', label: 'Duration' },
];

export function SortControl({ mode, onChange, edgeInset = 16 }: SortControlProps) {
  const accentColor = useAccentColor();

  return (
    <View style={[styles.row, { paddingHorizontal: edgeInset }]}>
      {OPTIONS.map((option) => (
        <Pressable
          key={option.mode}
          style={[styles.chip, mode === option.mode ? { backgroundColor: accentColor } : null]}
          onPress={() => onChange(option.mode)}>
          <ThemedText style={[styles.chipText, mode === option.mode ? styles.chipTextActive : null]}>
            {option.label}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    paddingBottom: 12,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(128,128,128,0.15)',
  },
  chipText: {
    fontSize: 12,
    opacity: 0.8,
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '600',
    opacity: 1,
  },
});
