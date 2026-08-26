import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PIN_LENGTH, PinPad } from '@/components/vault/PinPad';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useVaultAuthStore } from '@/hooks/useVaultAuthStore';
import { radius, spacing, typography } from '@/theme/tokens';

type VerifyPinSheetProps = {
  visible: boolean;
  title?: string;
  onCancel: () => void;
  onVerified: () => void;
};

function formatCountdown(ms: number): string {
  const seconds = Math.max(1, Math.ceil(ms / 1000));
  return `Too many attempts. Try again in ${seconds}s.`;
}

/**
 * Bottom sheet that gates an action behind the vault's own PIN — used
 * anywhere a security-sensitive setting (changing the PIN itself, toggling
 * biometric unlock) shouldn't be changeable by just anyone holding an
 * unlocked phone. Shares useVaultAuthStore's verifyPin, so attempts here
 * count toward the same rate-limited lockout as the main vault lock screen.
 */
export function VerifyPinSheet({ visible, title = 'Enter current PIN', onCancel, onVerified }: VerifyPinSheetProps) {
  const surfaceColor = useThemeColor({}, 'surface');
  const borderColor = useThemeColor({}, 'surfaceBorder');
  const dangerColor = useThemeColor({}, 'danger');
  const lockedUntil = useVaultAuthStore((s) => s.lockedUntil);
  const verifyPin = useVaultAuthStore((s) => s.verifyPin);

  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  const locked = !!lockedUntil && lockedUntil > now;

  useEffect(() => {
    if (!locked) {
      return;
    }
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [locked]);

  useEffect(() => {
    if (visible) {
      setValue('');
      setError(null);
    }
  }, [visible]);

  const handleChange = async (next: string) => {
    setError(null);
    setValue(next);
    if (next.length !== PIN_LENGTH) {
      return;
    }
    const ok = await verifyPin(next);
    setValue('');
    if (ok) {
      onVerified();
    } else {
      setError('Incorrect PIN');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable
          style={[styles.sheet, { backgroundColor: surfaceColor, borderColor }]}
          onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <View style={styles.wrap}>
            <ThemedText style={styles.title}>{title}</ThemedText>
            {locked ? (
              <ThemedText style={[styles.error, { color: dangerColor }]}>
                {formatCountdown(lockedUntil! - now)}
              </ThemedText>
            ) : (
              <>
                {error ? <ThemedText style={[styles.error, { color: dangerColor }]}>{error}</ThemedText> : null}
                <PinPad value={value} onChange={handleChange} />
              </>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.4)',
    marginBottom: spacing.lg,
  },
  wrap: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  title: {
    fontSize: typography.size.title,
    fontWeight: typography.weight.medium,
  },
  error: {
    fontSize: typography.size.meta,
    textAlign: 'center',
  },
});
