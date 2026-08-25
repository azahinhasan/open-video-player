import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { AccentSwatch } from '@/components/settings/AccentSwatch';
import { SegmentedControl } from '@/components/settings/SegmentedControl';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ACCENT_COLORS, ACCENT_COLOR_LABELS, type AccentColorKey } from '@/constants/theme';
import { useLibraryPreferences } from '@/hooks/useLibraryPreferences';
import { usePlaybackPreferences } from '@/hooks/usePlaybackPreferences';
import { useAccentColor, useThemePreference } from '@/hooks/useThemePreference';
import { useThemeColor } from '@/hooks/use-theme-color';
import { radius, spacing, typography } from '@/theme/tokens';
import type { ResumeBehavior } from '@/utils/playbackPreferences';
import type { ThemeMode } from '@/utils/themePreference';

const RESUME_OPTIONS: { value: ResumeBehavior; label: string }[] = [
  { value: 'resume', label: 'Resume' },
  { value: 'restart', label: 'Restart' },
];

const MODE_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const ACCENT_KEYS = Object.keys(ACCENT_COLORS) as AccentColorKey[];

function SectionHeader({ title }: { title: string }) {
  const borderColor = useThemeColor({}, 'surfaceBorder');
  return (
    <View style={styles.sectionHeader}>
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      <View style={[styles.sectionDivider, { backgroundColor: borderColor }]} />
    </View>
  );
}

function Card({ children }: { children: ReactNode }) {
  const surfaceColor = useThemeColor({}, 'surface');
  const borderColor = useThemeColor({}, 'surfaceBorder');
  return <View style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}>{children}</View>;
}

export default function SettingsScreen() {
  const mode = useThemePreference((s) => s.mode);
  const setMode = useThemePreference((s) => s.setMode);
  const accent = useThemePreference((s) => s.accent);
  const setAccent = useThemePreference((s) => s.setAccent);
  const accentColor = useAccentColor();
  const borderColor = useThemeColor({}, 'surfaceBorder');
  const mutedColor = useThemeColor({}, 'textMuted');

  const resumeBehavior = usePlaybackPreferences((s) => s.resumeBehavior);
  const setResumeBehavior = usePlaybackPreferences((s) => s.setResumeBehavior);
  const autoPlayNext = usePlaybackPreferences((s) => s.autoPlayNext);
  const setAutoPlayNext = usePlaybackPreferences((s) => s.setAutoPlayNext);

  const autoRefreshOnLaunch = useLibraryPreferences((s) => s.autoRefreshOnLaunch);
  const setAutoRefreshOnLaunch = useLibraryPreferences((s) => s.setAutoRefreshOnLaunch);

  return (
    <ThemedView style={styles.container}>
      <SectionHeader title="Library" />
      <Card>
        <View style={styles.row}>
          <Ionicons name="refresh-outline" size={20} color={autoRefreshOnLaunch ? accentColor : mutedColor} />
          <ThemedText style={styles.rowLabel}>Auto-refresh on launch</ThemedText>
          <View style={styles.rowSpacer} />
          <Switch
            value={autoRefreshOnLaunch}
            onValueChange={setAutoRefreshOnLaunch}
            trackColor={{ false: 'rgba(128,128,128,0.3)', true: accentColor }}
            thumbColor="#fff"
          />
        </View>
      </Card>

      <SectionHeader title="Playback" />
      <Card>
        <View style={styles.controlBlock}>
          <ThemedText style={styles.controlLabel}>When reopening a video</ThemedText>
          <SegmentedControl options={RESUME_OPTIONS} value={resumeBehavior} onChange={setResumeBehavior} />
        </View>

        <View style={[styles.rowDivider, { backgroundColor: borderColor }]} />

        <View style={styles.row}>
          <Ionicons name="play-forward-outline" size={20} color={autoPlayNext ? accentColor : mutedColor} />
          <ThemedText style={styles.rowLabel}>Autoplay next video</ThemedText>
          <View style={styles.rowSpacer} />
          <Switch
            value={autoPlayNext}
            onValueChange={setAutoPlayNext}
            trackColor={{ false: 'rgba(128,128,128,0.3)', true: accentColor }}
            thumbColor="#fff"
          />
        </View>
      </Card>

      <SectionHeader title="Appearance" />
      <Card>
        <View style={styles.controlBlock}>
          <ThemedText style={styles.controlLabel}>Theme</ThemedText>
          <SegmentedControl options={MODE_OPTIONS} value={mode} onChange={setMode} />
        </View>
      </Card>

      <SectionHeader title="Accent color" />
      <Card>
        <View style={styles.swatchRow}>
          {ACCENT_KEYS.map((key) => (
            <AccentSwatch
              key={key}
              color={ACCENT_COLORS[key]}
              label={ACCENT_COLOR_LABELS[key]}
              selected={key === accent}
              onPress={() => setAccent(key)}
            />
          ))}
        </View>
      </Card>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: spacing.lg,
  },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.size.meta,
    fontWeight: typography.weight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.6,
    marginBottom: spacing.sm,
  },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
  },
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  controlBlock: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  controlLabel: {
    fontSize: typography.size.meta,
    opacity: 0.6,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowLabel: {
    fontSize: typography.size.body,
  },
  rowSpacer: {
    flex: 1,
  },
  swatchRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    justifyContent: 'space-between',
  },
});
