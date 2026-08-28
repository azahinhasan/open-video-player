import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccentSwatch } from '@/components/settings/AccentSwatch';
import { Card } from '@/components/settings/Card';
import { CustomColorSheet } from '@/components/settings/CustomColorSheet';
import { SegmentedControl } from '@/components/settings/SegmentedControl';
import { settingsStyles as styles } from '@/components/settings/settingsStyles';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ACCENT_COLORS, ACCENT_COLOR_LABELS, type AccentColorKey } from '@/constants/theme';
import { useThemePreference } from '@/hooks/useThemePreference';
import { useThemeColor } from '@/hooks/use-theme-color';
import { spacing, typography } from '@/theme/tokens';
import type { ThemeMode } from '@/utils/themePreference';

const MODE_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'warm', label: 'Warm' },
];

const ACCENT_KEYS = Object.keys(ACCENT_COLORS) as AccentColorKey[];

function CustomAccentButton({
  color,
  isSelected,
  onPress,
}: {
  color: string;
  isSelected: boolean;
  onPress: () => void;
}) {
  const mutedColor = useThemeColor({}, 'textMuted');
  return (
    <Pressable onPress={onPress} style={localStyles.swatchWrap} hitSlop={8}>
      <View style={localStyles.dotSlot}>
        <View
          style={[
            localStyles.customDot,
            isSelected ? { backgroundColor: color, borderColor: color } : { borderColor: mutedColor },
          ]}>
          {isSelected ? null : <Ionicons name="add" size={18} color={mutedColor} />}
        </View>
      </View>
      <ThemedText style={[localStyles.swatchLabel, isSelected ? localStyles.swatchLabelSelected : null]}>
        Custom
      </ThemedText>
    </Pressable>
  );
}

export default function AppearanceSettingsScreen() {
  const insets = useSafeAreaInsets();
  const mode = useThemePreference((s) => s.mode);
  const setMode = useThemePreference((s) => s.setMode);
  const accent = useThemePreference((s) => s.accent);
  const setAccent = useThemePreference((s) => s.setAccent);
  const [colorSheetVisible, setColorSheetVisible] = useState(false);

  const isPreset = ACCENT_KEYS.some((key) => ACCENT_COLORS[key].toLowerCase() === accent.toLowerCase());

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}>
        <Card>
          <View style={styles.controlBlock}>
            <ThemedText style={styles.controlLabel}>Theme</ThemedText>
            <SegmentedControl options={MODE_OPTIONS} value={mode} onChange={setMode} />
          </View>
        </Card>

        <Card>
          <View style={localStyles.swatchRow}>
            {ACCENT_KEYS.map((key) => (
              <AccentSwatch
                key={key}
                color={ACCENT_COLORS[key]}
                label={ACCENT_COLOR_LABELS[key]}
                selected={accent.toLowerCase() === ACCENT_COLORS[key].toLowerCase()}
                onPress={() => setAccent(ACCENT_COLORS[key])}
              />
            ))}
            <CustomAccentButton
              color={accent}
              isSelected={!isPreset}
              onPress={() => setColorSheetVisible(true)}
            />
          </View>
        </Card>
      </ScrollView>

      <CustomColorSheet
        visible={colorSheetVisible}
        initialColor={accent}
        onCancel={() => setColorSheetVisible(false)}
        onConfirm={(hex) => {
          setAccent(hex);
          setColorSheetVisible(false);
        }}
      />
    </ThemedView>
  );
}

const localStyles = StyleSheet.create({
  swatchRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    justifyContent: 'space-between',
  },
  swatchWrap: {
    alignItems: 'center',
    gap: 8,
  },
  dotSlot: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchLabel: {
    fontSize: typography.size.micro,
    opacity: 0.6,
  },
  swatchLabelSelected: {
    opacity: 1,
    fontWeight: typography.weight.medium,
  },
});
