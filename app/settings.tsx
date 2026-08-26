import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccentSwatch } from '@/components/settings/AccentSwatch';
import { CustomColorSheet } from '@/components/settings/CustomColorSheet';
import { SegmentedControl } from '@/components/settings/SegmentedControl';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ACCENT_COLORS, ACCENT_COLOR_LABELS, type AccentColorKey } from '@/constants/theme';
import { useLibraryPreferences } from '@/hooks/useLibraryPreferences';
import { usePlaybackPreferences } from '@/hooks/usePlaybackPreferences';
import { useAccentColor, useThemePreference } from '@/hooks/useThemePreference';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useVaultAuthStore } from '@/hooks/useVaultAuthStore';
import { PinGatedSwitch } from '@/components/settings/PinGatedSwitch';
import { PinSetupSheet } from '@/components/vault/PinSetupSheet';
import { VerifyPinSheet } from '@/components/vault/VerifyPinSheet';
import { radius, spacing, typography } from '@/theme/tokens';
import type { ControlsLayout, ResumeBehavior } from '@/utils/playbackPreferences';
import type { ThemeMode } from '@/utils/themePreference';

const RESUME_OPTIONS: { value: ResumeBehavior; label: string }[] = [
  { value: 'resume', label: 'Resume' },
  { value: 'restart', label: 'Restart' },
];

const CONTROLS_LAYOUT_OPTIONS: { value: ControlsLayout; label: string }[] = [
  { value: 'center', label: 'Center' },
  { value: 'bottom', label: 'Below bar' },
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
    <Pressable onPress={onPress} style={styles.swatchWrap} hitSlop={8}>
      <View style={styles.dotSlot}>
        <View
          style={[
            styles.customDot,
            isSelected ? { backgroundColor: color, borderColor: color } : { borderColor: mutedColor },
          ]}>
          {isSelected ? null : <Ionicons name="add" size={18} color={mutedColor} />}
        </View>
      </View>
      <ThemedText style={[styles.swatchLabel, isSelected ? styles.swatchLabelSelected : null]}>
        Custom
      </ThemedText>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mode = useThemePreference((s) => s.mode);
  const setMode = useThemePreference((s) => s.setMode);
  const accent = useThemePreference((s) => s.accent);
  const setAccent = useThemePreference((s) => s.setAccent);
  const accentColor = useAccentColor();
  const borderColor = useThemeColor({}, 'surfaceBorder');
  const mutedColor = useThemeColor({}, 'textMuted');
  const [colorSheetVisible, setColorSheetVisible] = useState(false);

  const resumeBehavior = usePlaybackPreferences((s) => s.resumeBehavior);
  const setResumeBehavior = usePlaybackPreferences((s) => s.setResumeBehavior);
  const autoPlayNext = usePlaybackPreferences((s) => s.autoPlayNext);
  const setAutoPlayNext = usePlaybackPreferences((s) => s.setAutoPlayNext);
  const controlsLayout = usePlaybackPreferences((s) => s.controlsLayout);
  const setControlsLayout = usePlaybackPreferences((s) => s.setControlsLayout);

  const autoRefreshOnLaunch = useLibraryPreferences((s) => s.autoRefreshOnLaunch);
  const setAutoRefreshOnLaunch = useLibraryPreferences((s) => s.setAutoRefreshOnLaunch);

  const hasVaultPin = useVaultAuthStore((s) => s.hasPin);
  const vaultBiometricsAvailable = useVaultAuthStore((s) => s.biometricsAvailable);
  const vaultBiometricsEnabled = useVaultAuthStore((s) => s.biometricsEnabled);
  const setVaultBiometricsEnabled = useVaultAuthStore((s) => s.setBiometricsEnabled);
  const vaultAuthInit = useVaultAuthStore((s) => s.init);
  const [pinSheetVisible, setPinSheetVisible] = useState(false);
  // Holds the toggle's requested value while its PIN check is pending —
  // applied only once verified, so the Switch (bound to the real
  // vaultBiometricsEnabled value) just snaps back on its own if cancelled.
  const [pendingBiometricsValue, setPendingBiometricsValue] = useState<boolean | null>(null);

  useEffect(() => {
    vaultAuthInit();
  }, [vaultAuthInit]);

  const handleBiometricsToggle = (next: boolean) => {
    if (!hasVaultPin) {
      // Nothing to protect yet — no PIN exists for anyone to have bypassed.
      setVaultBiometricsEnabled(next);
      return;
    }
    setPendingBiometricsValue(next);
  };

  const handleBiometricsVerified = () => {
    if (pendingBiometricsValue !== null) {
      setVaultBiometricsEnabled(pendingBiometricsValue);
    }
    setPendingBiometricsValue(null);
  };

  const isPreset = ACCENT_KEYS.some((key) => ACCENT_COLORS[key].toLowerCase() === accent.toLowerCase());

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}>
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

        <View style={[styles.rowDivider, { backgroundColor: borderColor }]} />

        <View style={styles.controlBlock}>
          <ThemedText style={styles.controlLabel}>Player button position</ThemedText>
          <SegmentedControl
            options={CONTROLS_LAYOUT_OPTIONS}
            value={controlsLayout}
            onChange={setControlsLayout}
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

      <SectionHeader title="Storage" />
      <Card>
        <Pressable style={styles.row} onPress={() => router.push('/storage-cleanup')}>
          <Ionicons name="server-outline" size={20} color={mutedColor} />
          <ThemedText style={styles.rowLabel}>Storage & cleanup</ThemedText>
          <View style={styles.rowSpacer} />
          <Ionicons name="chevron-forward" size={18} color={mutedColor} />
        </Pressable>
      </Card>

      <SectionHeader title="Vault security" />
      <Card>
        <View style={styles.row}>
          <Ionicons
            name="finger-print-outline"
            size={20}
            color={vaultBiometricsEnabled ? accentColor : mutedColor}
          />
          <ThemedText style={styles.rowLabel}>Unlock with biometrics</ThemedText>
          <View style={styles.rowSpacer} />
          <PinGatedSwitch
            value={vaultBiometricsEnabled}
            onPress={() => handleBiometricsToggle(!vaultBiometricsEnabled)}
            activeColor={accentColor}
          />
        </View>
        {vaultBiometricsEnabled && !vaultBiometricsAvailable ? (
          <ThemedText style={[styles.hint, { color: mutedColor }]}>
            No fingerprint or face unlock is set up on this device yet — the Vault will fall back to your PIN
            until you add one in your device settings.
          </ThemedText>
        ) : null}
        {hasVaultPin ? (
          <>
            <View style={[styles.rowDivider, { backgroundColor: borderColor }]} />
            <Pressable style={styles.row} onPress={() => setPinSheetVisible(true)}>
              <Ionicons name="keypad-outline" size={20} color={mutedColor} />
              <ThemedText style={styles.rowLabel}>Change Vault PIN</ThemedText>
              <View style={styles.rowSpacer} />
              <Ionicons name="chevron-forward" size={18} color={mutedColor} />
            </Pressable>
          </>
        ) : null}
      </Card>
      </ScrollView>

      <PinSetupSheet
        visible={pinSheetVisible}
        onCancel={() => setPinSheetVisible(false)}
        onDone={() => setPinSheetVisible(false)}
      />

      <VerifyPinSheet
        visible={pendingBiometricsValue !== null}
        onCancel={() => setPendingBiometricsValue(null)}
        onVerified={handleBiometricsVerified}
      />

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
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
  hint: {
    fontSize: typography.size.micro,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    marginTop: -spacing.sm,
  },
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
