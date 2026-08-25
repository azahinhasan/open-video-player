import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ACCENT_COLORS, ACCENT_COLOR_LABELS, type AccentColorKey } from '@/constants/theme';
import { usePlaybackPreferences } from '@/hooks/usePlaybackPreferences';
import { useThemePreference } from '@/hooks/useThemePreference';
import type { ResumeBehavior } from '@/utils/playbackPreferences';
import type { ThemeMode } from '@/utils/themePreference';

const MODE_OPTIONS: { mode: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { mode: 'system', label: 'System default', icon: 'phone-portrait-outline' },
  { mode: 'light', label: 'Light', icon: 'sunny-outline' },
  { mode: 'dark', label: 'Dark', icon: 'moon-outline' },
];

const RESUME_OPTIONS: { behavior: ResumeBehavior; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { behavior: 'resume', label: 'Resume where I left off', icon: 'play-skip-forward-outline' },
  { behavior: 'restart', label: 'Always start from the beginning', icon: 'refresh-outline' },
];

const ACCENT_KEYS = Object.keys(ACCENT_COLORS) as AccentColorKey[];

export default function SettingsScreen() {
  const mode = useThemePreference((s) => s.mode);
  const setMode = useThemePreference((s) => s.setMode);
  const accent = useThemePreference((s) => s.accent);
  const setAccent = useThemePreference((s) => s.setAccent);
  const accentColor = ACCENT_COLORS[accent];

  const resumeBehavior = usePlaybackPreferences((s) => s.resumeBehavior);
  const setResumeBehavior = usePlaybackPreferences((s) => s.setResumeBehavior);
  const autoPlayNext = usePlaybackPreferences((s) => s.autoPlayNext);
  const setAutoPlayNext = usePlaybackPreferences((s) => s.setAutoPlayNext);

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.sectionTitle}>Playback</ThemedText>
      <View style={styles.section}>
        {RESUME_OPTIONS.map((option) => {
          const selected = option.behavior === resumeBehavior;
          return (
            <Pressable
              key={option.behavior}
              style={styles.row}
              onPress={() => setResumeBehavior(option.behavior)}>
              <Ionicons name={option.icon} size={20} color={selected ? accentColor : '#888'} />
              <ThemedText style={styles.rowLabel}>{option.label}</ThemedText>
              <View style={styles.rowSpacer} />
              {selected ? <Ionicons name="checkmark" size={20} color={accentColor} /> : null}
            </Pressable>
          );
        })}
        <Pressable style={styles.row} onPress={() => setAutoPlayNext(!autoPlayNext)}>
          <Ionicons name="play-forward-outline" size={20} color={autoPlayNext ? accentColor : '#888'} />
          <ThemedText style={styles.rowLabel}>Autoplay next video</ThemedText>
          <View style={styles.rowSpacer} />
          <Ionicons
            name={autoPlayNext ? 'checkbox' : 'square-outline'}
            size={20}
            color={autoPlayNext ? accentColor : '#888'}
          />
        </Pressable>
      </View>

      <ThemedText style={styles.sectionTitle}>Appearance</ThemedText>
      <View style={styles.section}>
        {MODE_OPTIONS.map((option) => {
          const selected = option.mode === mode;
          return (
            <Pressable key={option.mode} style={styles.row} onPress={() => setMode(option.mode)}>
              <Ionicons name={option.icon} size={20} color={selected ? accentColor : '#888'} />
              <ThemedText style={styles.rowLabel}>{option.label}</ThemedText>
              <View style={styles.rowSpacer} />
              {selected ? <Ionicons name="checkmark" size={20} color={accentColor} /> : null}
            </Pressable>
          );
        })}
      </View>

      <ThemedText style={styles.sectionTitle}>Accent color</ThemedText>
      <View style={[styles.section, styles.swatchRow]}>
        {ACCENT_KEYS.map((key) => {
          const selected = key === accent;
          return (
            <Pressable key={key} style={styles.swatchWrap} onPress={() => setAccent(key)}>
              <View
                style={[
                  styles.swatch,
                  { backgroundColor: ACCENT_COLORS[key] },
                  selected ? styles.swatchSelected : null,
                ]}>
                {selected ? <Ionicons name="checkmark" size={18} color="#fff" /> : null}
              </View>
              <ThemedText style={styles.swatchLabel}>{ACCENT_COLOR_LABELS[key]}</ThemedText>
            </Pressable>
          );
        })}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    opacity: 0.5,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  section: {
    marginBottom: 28,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowLabel: {
    fontSize: 15,
  },
  rowSpacer: {
    flex: 1,
  },
  swatchRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 20,
  },
  swatchWrap: {
    alignItems: 'center',
    gap: 6,
  },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchSelected: {
    borderWidth: 2,
    borderColor: '#fff',
  },
  swatchLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
});
