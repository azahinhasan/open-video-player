import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PinGatedSwitch } from '@/components/settings/PinGatedSwitch';
import { Card } from '@/components/settings/Card';
import { settingsStyles as styles } from '@/components/settings/settingsStyles';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAccentColor } from '@/hooks/useThemePreference';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useVaultAuthStore } from '@/hooks/useVaultAuthStore';
import { spacing } from '@/theme/tokens';
import { PinSetupSheet } from '@/components/vault/PinSetupSheet';
import { VerifyPinSheet } from '@/components/vault/VerifyPinSheet';

export default function VaultSecuritySettingsScreen() {
  const insets = useSafeAreaInsets();
  const accentColor = useAccentColor();
  const borderColor = useThemeColor({}, 'surfaceBorder');
  const mutedColor = useThemeColor({}, 'textMuted');

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

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}>
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
    </ThemedView>
  );
}
