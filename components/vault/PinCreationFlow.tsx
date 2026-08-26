import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PIN_LENGTH, PinPad } from '@/components/vault/PinPad';
import { useThemeColor } from '@/hooks/use-theme-color';
import { spacing, typography } from '@/theme/tokens';

type PinCreationFlowProps = {
  onComplete: (pin: string) => void;
  submitting?: boolean;
};

/**
 * Shared "enter PIN, then confirm PIN, mismatch → retry" flow used by both
 * first-run vault setup and change-PIN.
 */
export function PinCreationFlow({ onComplete, submitting = false }: PinCreationFlowProps) {
  const [stage, setStage] = useState<'enter' | 'confirm'>('enter');
  const [firstPin, setFirstPin] = useState('');
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const dangerColor = useThemeColor({}, 'danger');

  const handleChange = (next: string) => {
    setError(null);
    setValue(next);
    if (next.length !== PIN_LENGTH) {
      return;
    }
    if (stage === 'enter') {
      setFirstPin(next);
      setStage('confirm');
      setValue('');
      return;
    }
    if (next === firstPin) {
      onComplete(next);
      return;
    }
    setError("PINs didn't match. Try again.");
    setStage('enter');
    setFirstPin('');
    setValue('');
  };

  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>{stage === 'enter' ? 'Create a PIN' : 'Confirm your PIN'}</ThemedText>
      {error ? <ThemedText style={[styles.error, { color: dangerColor }]}>{error}</ThemedText> : null}
      <PinPad value={value} onChange={handleChange} disabled={submitting} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  title: {
    fontSize: typography.size.title,
    fontWeight: typography.weight.medium,
  },
  error: {
    fontSize: typography.size.meta,
  },
});
