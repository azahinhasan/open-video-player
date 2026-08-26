import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PinCreationFlow } from '@/components/vault/PinCreationFlow';
import { PIN_LENGTH, PinPad } from '@/components/vault/PinPad';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useVaultAuthStore } from '@/hooks/useVaultAuthStore';
import { radius, spacing, typography } from '@/theme/tokens';

type PinSetupSheetProps = {
  visible: boolean;
  onCancel: () => void;
  onDone: () => void;
};

function formatCountdown(ms: number): string {
  const seconds = Math.max(1, Math.ceil(ms / 1000));
  return `Too many attempts. Try again in ${seconds}s.`;
}

/**
 * Bottom-sheet used for Settings' "Change PIN" row. If a PIN is already set
 * (always true for this call site, but handled defensively), the sheet
 * first requires the CURRENT PIN before letting the user set a new one —
 * otherwise anyone with the phone unlocked could silently take over the
 * vault by just changing its PIN. Reuses useVaultAuthStore's verifyPin, so
 * this shares the same rate-limited lockout as the main vault lock screen
 * rather than offering a second, unprotected way to brute-force the PIN.
 */
export function PinSetupSheet({ visible, onCancel, onDone }: PinSetupSheetProps) {
  const surfaceColor = useThemeColor({}, 'surface');
  const borderColor = useThemeColor({}, 'surfaceBorder');
  const dangerColor = useThemeColor({}, 'danger');
  const hasPin = useVaultAuthStore((s) => s.hasPin);
  const lockedUntil = useVaultAuthStore((s) => s.lockedUntil);
  const verifyPin = useVaultAuthStore((s) => s.verifyPin);
  const changePin = useVaultAuthStore((s) => s.changePin);

  const [stage, setStage] = useState<'verify' | 'create'>('verify');
  const [verifyValue, setVerifyValue] = useState('');
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [submitting, setSubmitting] = useState(false);
  // Bumped every time the sheet opens, to remount PinCreationFlow with fresh state.
  const [instanceKey, setInstanceKey] = useState(0);

  const locked = !!lockedUntil && lockedUntil > now;

  useEffect(() => {
    if (!locked) {
      return;
    }
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [locked]);

  const resetState = () => {
    setStage(hasPin ? 'verify' : 'create');
    setVerifyValue('');
    setVerifyError(null);
    setInstanceKey((k) => k + 1);
  };

  const handleVerifyChange = async (next: string) => {
    setVerifyError(null);
    setVerifyValue(next);
    if (next.length !== PIN_LENGTH) {
      return;
    }
    const ok = await verifyPin(next);
    setVerifyValue('');
    if (ok) {
      setStage('create');
    } else {
      setVerifyError('Incorrect PIN');
    }
  };

  const handleComplete = async (pin: string) => {
    setSubmitting(true);
    try {
      await changePin(pin);
      onDone();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} onShow={resetState}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable
          style={[styles.sheet, { backgroundColor: surfaceColor, borderColor }]}
          onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          {stage === 'verify' ? (
            <View style={styles.verifyWrap}>
              <ThemedText style={styles.title}>Enter current PIN</ThemedText>
              {locked ? (
                <ThemedText style={[styles.error, { color: dangerColor }]}>
                  {formatCountdown(lockedUntil! - now)}
                </ThemedText>
              ) : (
                <>
                  {verifyError ? (
                    <ThemedText style={[styles.error, { color: dangerColor }]}>{verifyError}</ThemedText>
                  ) : null}
                  <PinPad value={verifyValue} onChange={handleVerifyChange} />
                </>
              )}
            </View>
          ) : (
            <PinCreationFlow key={instanceKey} onComplete={handleComplete} submitting={submitting} />
          )}
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
  verifyWrap: {
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
