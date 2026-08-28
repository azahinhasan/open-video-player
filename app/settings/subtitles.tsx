import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/settings/Card';
import { CustomColorSheet } from '@/components/settings/CustomColorSheet';
import { SegmentedControl } from '@/components/settings/SegmentedControl';
import { settingsStyles as styles } from '@/components/settings/settingsStyles';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAccentColor } from '@/hooks/useThemePreference';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useSubtitleStylePreferences } from '@/hooks/useSubtitleStylePreferences';
import { spacing } from '@/theme/tokens';
import type { SubtitleBackgroundOpacity, SubtitleFontSize } from '@/utils/subtitleStylePreferences';

const SUBTITLE_FONT_SIZE_OPTIONS: { value: SubtitleFontSize; label: string }[] = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
];

const SUBTITLE_BACKGROUND_OPACITY_OPTIONS: { value: SubtitleBackgroundOpacity; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export default function SubtitleSettingsScreen() {
  const insets = useSafeAreaInsets();
  const accentColor = useAccentColor();
  const borderColor = useThemeColor({}, 'surfaceBorder');
  const mutedColor = useThemeColor({}, 'textMuted');

  const subtitleFontSize = useSubtitleStylePreferences((s) => s.fontSize);
  const setSubtitleFontSize = useSubtitleStylePreferences((s) => s.setFontSize);
  const subtitleBold = useSubtitleStylePreferences((s) => s.bold);
  const setSubtitleBold = useSubtitleStylePreferences((s) => s.setBold);
  const subtitleTextColor = useSubtitleStylePreferences((s) => s.textColor);
  const setSubtitleTextColor = useSubtitleStylePreferences((s) => s.setTextColor);
  const subtitleBackgroundColor = useSubtitleStylePreferences((s) => s.backgroundColor);
  const setSubtitleBackgroundColor = useSubtitleStylePreferences((s) => s.setBackgroundColor);
  const subtitleBackgroundOpacity = useSubtitleStylePreferences((s) => s.backgroundOpacity);
  const setSubtitleBackgroundOpacity = useSubtitleStylePreferences((s) => s.setBackgroundOpacity);
  const [subtitleColorTarget, setSubtitleColorTarget] = useState<'text' | 'background' | null>(null);

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}>
        <Card>
          <View style={styles.controlBlock}>
            <ThemedText style={styles.controlLabel}>Text size</ThemedText>
            <SegmentedControl
              options={SUBTITLE_FONT_SIZE_OPTIONS}
              value={subtitleFontSize}
              onChange={setSubtitleFontSize}
            />
          </View>

          <View style={[styles.rowDivider, { backgroundColor: borderColor }]} />

          <View style={styles.row}>
            <Ionicons name="text-outline" size={20} color={subtitleBold ? accentColor : mutedColor} />
            <ThemedText style={styles.rowLabel}>Bold</ThemedText>
            <View style={styles.rowSpacer} />
            <Switch
              value={subtitleBold}
              onValueChange={setSubtitleBold}
              trackColor={{ false: 'rgba(128,128,128,0.3)', true: accentColor }}
              thumbColor="#fff"
            />
          </View>

          <View style={[styles.rowDivider, { backgroundColor: borderColor }]} />

          <Pressable style={styles.row} onPress={() => setSubtitleColorTarget('text')}>
            <Ionicons name="color-palette-outline" size={20} color={mutedColor} />
            <ThemedText style={styles.rowLabel}>Text color</ThemedText>
            <View style={styles.rowSpacer} />
            <View style={[styles.colorSwatch, { backgroundColor: subtitleTextColor, borderColor }]} />
          </Pressable>

          <View style={[styles.rowDivider, { backgroundColor: borderColor }]} />

          <Pressable style={styles.row} onPress={() => setSubtitleColorTarget('background')}>
            <Ionicons name="square-outline" size={20} color={mutedColor} />
            <ThemedText style={styles.rowLabel}>Background color</ThemedText>
            <View style={styles.rowSpacer} />
            <View style={[styles.colorSwatch, { backgroundColor: subtitleBackgroundColor, borderColor }]} />
          </Pressable>

          <View style={[styles.rowDivider, { backgroundColor: borderColor }]} />

          <View style={styles.controlBlock}>
            <ThemedText style={styles.controlLabel}>Background opacity</ThemedText>
            <SegmentedControl
              options={SUBTITLE_BACKGROUND_OPACITY_OPTIONS}
              value={subtitleBackgroundOpacity}
              onChange={setSubtitleBackgroundOpacity}
            />
          </View>
        </Card>
      </ScrollView>

      <CustomColorSheet
        visible={subtitleColorTarget !== null}
        initialColor={subtitleColorTarget === 'background' ? subtitleBackgroundColor : subtitleTextColor}
        onCancel={() => setSubtitleColorTarget(null)}
        onConfirm={(hex) => {
          if (subtitleColorTarget === 'background') {
            setSubtitleBackgroundColor(hex);
          } else {
            setSubtitleTextColor(hex);
          }
          setSubtitleColorTarget(null);
        }}
      />
    </ThemedView>
  );
}
