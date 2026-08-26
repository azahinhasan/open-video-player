import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useAccentColor } from '@/hooks/useThemePreference';
import { useThemeColor } from '@/hooks/use-theme-color';
import { radius, spacing, typography } from '@/theme/tokens';
import { splitFilename } from '@/utils/renameVideo';

type RenameSheetProps = {
  visible: boolean;
  currentFilename: string;
  onCancel: () => void;
  onConfirm: (newBaseName: string) => void;
};

export function RenameSheet({ visible, currentFilename, onCancel, onConfirm }: RenameSheetProps) {
  const surfaceColor = useThemeColor({}, 'surface');
  const borderColor = useThemeColor({}, 'surfaceBorder');
  const textColor = useThemeColor({}, 'text');
  const mutedColor = useThemeColor({}, 'textMuted');
  const accentColor = useAccentColor();
  const { base, extension } = splitFilename(currentFilename);
  const [value, setValue] = useState(base);
  const inputRef = useRef<TextInput>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      setValue(base);
    }
    // Only reset when the sheet opens (or targets a different file) — not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, currentFilename]);

  // Cancels the pending auto-focus (below) if the sheet closes or the
  // component unmounts before it fires.
  useEffect(() => {
    return () => {
      if (focusTimerRef.current) {
        clearTimeout(focusTimerRef.current);
      }
    };
  }, [visible]);

  const trimmed = value.trim();
  const canSave = trimmed.length > 0 && `${trimmed}${extension}` !== currentFilename;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      // React Native's Modal already sets its own Android window to
      // SOFT_INPUT_ADJUST_RESIZE, so the window itself shrinks around the
      // keyboard automatically — wrapping this in a KeyboardAvoidingView on
      // top of that fought over the same resize and caused the sheet to
      // visibly jump/oscillate. A short delay here lets that native resize
      // (and the modal's own fade-in) settle before focus is requested, so
      // the keyboard reliably opens on the first tap instead of sometimes not
      // triggering at all.
      onShow={() => {
        focusTimerRef.current = setTimeout(() => inputRef.current?.focus(), 50);
      }}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable
          style={[styles.sheet, { backgroundColor: surfaceColor, borderColor }]}
          onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />

          <ThemedText style={styles.title}>Rename video</ThemedText>

          <View style={[styles.inputRow, { borderColor }]}>
            <TextInput
              ref={inputRef}
              style={[styles.input, { color: textColor }]}
              value={value}
              onChangeText={setValue}
              selectTextOnFocus
              placeholder="File name"
              placeholderTextColor={mutedColor}
            />
            {extension ? <Text style={[styles.extension, { color: mutedColor }]}>{extension}</Text> : null}
          </View>

          <View style={styles.actionsRow}>
            <Pressable style={styles.cancelButton} onPress={onCancel}>
              <ThemedText style={styles.cancelLabel}>Cancel</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.confirmButton, { backgroundColor: accentColor, opacity: canSave ? 1 : 0.4 }]}
              disabled={!canSave}
              onPress={() => onConfirm(trimmed)}>
              <Text style={styles.confirmLabel}>Save</Text>
            </Pressable>
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
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.4)',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
    marginBottom: spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  input: {
    flex: 1,
    fontSize: typography.size.body,
    paddingVertical: 12,
  },
  extension: {
    fontSize: typography.size.body,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(128,128,128,0.14)',
  },
  cancelLabel: {
    fontSize: typography.size.body,
    opacity: 0.85,
  },
  confirmButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmLabel: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
    color: '#fff',
  },
});
