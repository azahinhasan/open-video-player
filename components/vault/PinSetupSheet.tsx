import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { PinCreationFlow } from '@/components/vault/PinCreationFlow';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useVaultAuthStore } from '@/hooks/useVaultAuthStore';
import { radius, spacing } from '@/theme/tokens';

type PinSetupSheetProps = {
  visible: boolean;
  onCancel: () => void;
  onDone: () => void;
};

/** Bottom-sheet wrapper around PinCreationFlow, used for Settings' "Change PIN" row. */
export function PinSetupSheet({ visible, onCancel, onDone }: PinSetupSheetProps) {
  const surfaceColor = useThemeColor({}, 'surface');
  const borderColor = useThemeColor({}, 'surfaceBorder');
  const changePin = useVaultAuthStore((s) => s.changePin);
  const [submitting, setSubmitting] = useState(false);
  // Bumped every time the sheet opens, to remount PinCreationFlow with fresh state.
  const [instanceKey, setInstanceKey] = useState(0);

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
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      onShow={() => setInstanceKey((k) => k + 1)}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable
          style={[styles.sheet, { backgroundColor: surfaceColor, borderColor }]}
          onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <PinCreationFlow key={instanceKey} onComplete={handleComplete} submitting={submitting} />
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
});
