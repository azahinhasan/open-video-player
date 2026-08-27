import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccentSwatch } from '@/components/settings/AccentSwatch';
import { CollapsibleSection } from '@/components/settings/CollapsibleSection';
import { CustomColorSheet } from '@/components/settings/CustomColorSheet';
import { SegmentedControl } from '@/components/settings/SegmentedControl';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ACCENT_COLORS, ACCENT_COLOR_LABELS, type AccentColorKey } from '@/constants/theme';
import { useLibraryPreferences } from '@/hooks/useLibraryPreferences';
import { usePlaybackPreferences } from '@/hooks/usePlaybackPreferences';
import { useAccentColor, useThemePreference } from '@/hooks/useThemePreference';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useSubtitleStylePreferences } from '@/hooks/useSubtitleStylePreferences';
import { useVaultAuthStore } from '@/hooks/useVaultAuthStore';
import { PinGatedSwitch } from '@/components/settings/PinGatedSwitch';
import { PinSetupSheet } from '@/components/vault/PinSetupSheet';
import { VerifyPinSheet } from '@/components/vault/VerifyPinSheet';
import { spacing, typography } from '@/theme/tokens';
import type { ControlsLayout, DefaultOrientation, ResumeBehavior } from '@/utils/playbackPreferences';
import type { SubtitleBackgroundOpacity, SubtitleFontSize } from '@/utils/subtitleStylePreferences';
import type { ThemeMode } from '@/utils/themePreference';

const RESUME_OPTIONS: { value: ResumeBehavior; label: string }[] = [
  { value: 'resume', label: 'Resume' },
  { value: 'restart', label: 'Restart' },
];

const CONTROLS_LAYOUT_OPTIONS: { value: ControlsLayout; label: string }[] = [
  { value: 'center', label: 'Center' },
  { value: 'bottom', label: 'Below bar' },
];

const DEFAULT_ORIENTATION_OPTIONS: { value: DefaultOrientation; label: string }[] = [
  { value: 'portrait', label: 'Portrait' },
  { value: 'landscape', label: 'Landscape' },
];

const MODE_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

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
  const defaultOrientation = usePlaybackPreferences((s) => s.defaultOrientation);
  const setDefaultOrientation = usePlaybackPreferences((s) => s.setDefaultOrientation);

  const autoRefreshOnLaunch = useLibraryPreferences((s) => s.autoRefreshOnLaunch);
  const setAutoRefreshOnLaunch = useLibraryPreferences((s) => s.setAutoRefreshOnLaunch);

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
      <CollapsibleSection title="Library">
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
      </CollapsibleSection>

      <CollapsibleSection title="Playback">
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

        <View style={[styles.rowDivider, { backgroundColor: borderColor }]} />

        <View style={styles.controlBlock}>
          <ThemedText style={styles.controlLabel}>Default orientation</ThemedText>
          <SegmentedControl
            options={DEFAULT_ORIENTATION_OPTIONS}
            value={defaultOrientation}
            onChange={setDefaultOrientation}
          />
        </View>
      </CollapsibleSection>

      <CollapsibleSection title="Subtitles">
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
      </CollapsibleSection>

      <CollapsibleSection title="Appearance">
        <View style={styles.controlBlock}>
          <ThemedText style={styles.controlLabel}>Theme</ThemedText>
          <SegmentedControl options={MODE_OPTIONS} value={mode} onChange={setMode} />
        </View>
      </CollapsibleSection>

      <CollapsibleSection title="Accent color">
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
      </CollapsibleSection>

      <CollapsibleSection title="Storage">
        <Pressable style={styles.row} onPress={() => router.push('/storage-cleanup')}>
          <Ionicons name="server-outline" size={20} color={mutedColor} />
          <ThemedText style={styles.rowLabel}>Storage & cleanup</ThemedText>
          <View style={styles.rowSpacer} />
          <Ionicons name="chevron-forward" size={18} color={mutedColor} />
        </Pressable>
      </CollapsibleSection>

      <CollapsibleSection title="Vault security">
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
      </CollapsibleSection>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.lg,
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
  colorSwatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
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
