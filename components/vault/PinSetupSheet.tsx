import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { PinCreationFlow } from '@/components/vault/PinCreationFlow';
import { VerifyPinSheet } from '@/components/vault/VerifyPinSheet';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useVaultAuthStore } from '@/hooks/useVaultAuthStore';
import { radius, spacing } from '@/theme/tokens';

type PinSetupSheetProps = {
  visible: boolean;
  onCancel: () => void;
  onDone: () => void;
};

/**
 * Used for Settings' "Change PIN" row. If a PIN is already set (always true
 * for this call site, but handled defensively), requires the CURRENT PIN
 * (via VerifyPinSheet) before letting the user set a new one — otherwise
 * anyone with the phone unlocked could silently take over the vault by just
 * changing its PIN.
 */
export function PinSetupSheet({ visible, onCancel, onDone }: PinSetupSheetProps) {
  const surfaceColor = useThemeColor({}, 'surface');
  const borderColor = useThemeColor({}, 'surfaceBorder');
  const hasPin = useVaultAuthStore((s) => s.hasPin);
  const changePin = useVaultAuthStore((s) => s.changePin);

  const [stage, setStage] = useState<'verify' | 'create'>('verify');
  const [submitting, setSubmitting] = useState(false);
  // Bumped every time the sheet opens, to remount PinCreationFlow with fresh state.
  const [instanceKey, setInstanceKey] = useState(0);

  useEffect(() => {
    if (visible) {
      setStage(hasPin ? 'verify' : 'create');
      setInstanceKey((k) => k + 1);
    }
  }, [visible, hasPin]);

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
    <>
      <VerifyPinSheet
        visible={visible && stage === 'verify'}
        onCancel={onCancel}
        onVerified={() => setStage('create')}
      />
      <Modal visible={visible && stage === 'create'} transparent animationType="slide" onRequestClose={onCancel}>
        <Pressable style={styles.backdrop} onPress={onCancel}>
          <Pressable
            style={[styles.sheet, { backgroundColor: surfaceColor, borderColor }]}
            onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            <PinCreationFlow key={instanceKey} onComplete={handleComplete} submitting={submitting} />
          </Pressable>
        </Pressable>
      </Modal>
    </>
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
