import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PIN_LENGTH, PinPad } from '@/components/vault/PinPad';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useVaultAuthStore } from '@/hooks/useVaultAuthStore';
import { spacing, typography } from '@/theme/tokens';

function formatCountdown(ms: number): string {
  const seconds = Math.max(1, Math.ceil(ms / 1000));
  return `Too many attempts. Try again in ${seconds}s.`;
}

export function VaultLockScreen() {
  const insets = useSafeAreaInsets();
  const dangerColor = useThemeColor({}, 'danger');
  const mutedColor = useThemeColor({}, 'textMuted');
  const biometricsAvailable = useVaultAuthStore((s) => s.biometricsAvailable);
  const biometricsEnabled = useVaultAuthStore((s) => s.biometricsEnabled);
  const lockedUntil = useVaultAuthStore((s) => s.lockedUntil);
  const verifyPin = useVaultAuthStore((s) => s.verifyPin);
  const authenticateWithBiometrics = useVaultAuthStore((s) => s.authenticateWithBiometrics);

  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [biometricAttempted, setBiometricAttempted] = useState(false);

  const locked = !!lockedUntil && lockedUntil > now;

  // Ticks the countdown while a lockout is active; otherwise idle.
  useEffect(() => {
    if (!locked) {
      return;
    }
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [locked]);

  // Fires the biometric prompt automatically once per mount, per doc §5.
  useEffect(() => {
    if (biometricsAvailable && biometricsEnabled && !biometricAttempted) {
      setBiometricAttempted(true);
      authenticateWithBiometrics();
    }
  }, [biometricsAvailable, biometricsEnabled, biometricAttempted, authenticateWithBiometrics]);

  const handleChange = async (next: string) => {
    setError(null);
    setValue(next);
    if (next.length !== PIN_LENGTH) {
      return;
    }
    const ok = await verifyPin(next);
    setValue('');
    if (!ok) {
      setError('Incorrect PIN');
    }
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + spacing.xl }]}>
      <View style={styles.header}>
        <Ionicons name="lock-closed" size={32} color={mutedColor} />
        <ThemedText style={styles.title}>Vault locked</ThemedText>
      </View>

      {locked ? (
        <ThemedText style={[styles.error, { color: dangerColor }]}>{formatCountdown(lockedUntil! - now)}</ThemedText>
      ) : (
        <>
          {error ? <ThemedText style={[styles.error, { color: dangerColor }]}>{error}</ThemedText> : null}
          <View style={styles.flowWrap}>
            <PinPad value={value} onChange={handleChange} />
          </View>
          {biometricsAvailable && biometricsEnabled ? (
            <ThemedText
              style={[styles.biometricLink, { color: mutedColor }]}
              onPress={() => authenticateWithBiometrics()}>
              Use biometrics instead
            </ThemedText>
          ) : null}
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  header: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.size.title,
    fontWeight: typography.weight.medium,
  },
  error: {
    fontSize: typography.size.meta,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  flowWrap: {
    marginTop: spacing.lg,
  },
  biometricLink: {
    marginTop: spacing.xl,
    fontSize: typography.size.meta,
  },
});
