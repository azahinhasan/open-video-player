import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PinCreationFlow } from '@/components/vault/PinCreationFlow';
import { useVaultAuthStore } from '@/hooks/useVaultAuthStore';
import { spacing, typography } from '@/theme/tokens';

export function VaultSetupScreen() {
  const insets = useSafeAreaInsets();
  const createPin = useVaultAuthStore((s) => s.createPin);
  const [submitting, setSubmitting] = useState(false);

  const handleComplete = async (pin: string) => {
    setSubmitting(true);
    try {
      await createPin(pin);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + spacing.xl }]}>
      <ThemedText style={styles.intro}>
        Set a PIN to protect your Vault. You&apos;ll use it — or your fingerprint/face, if available — every time
        you open it.
      </ThemedText>
      <View style={styles.flowWrap}>
        <PinCreationFlow onComplete={handleComplete} submitting={submitting} />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  intro: {
    textAlign: 'center',
    opacity: 0.7,
    fontSize: typography.size.body,
  },
  flowWrap: {
    flex: 1,
    justifyContent: 'center',
  },
});
