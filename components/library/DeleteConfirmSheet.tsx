import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';
import { useAccentColor } from '@/hooks/useThemePreference';
import { radius, spacing, typography } from '@/theme/tokens';

type DeleteConfirmSheetProps = {
  visible: boolean;
  title: string;
  subtitle?: string;
  thumbnailUri?: string | null;
  confirmLabel?: string;
  /** 'accent' is used for non-destructive-but-consequential actions, e.g. moving to the Vault. Defaults to 'danger'. */
  tone?: 'danger' | 'accent';
  warningText?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteConfirmSheet({
  visible,
  title,
  subtitle,
  thumbnailUri,
  confirmLabel = 'Delete',
  tone = 'danger',
  warningText = "This can't be undone.",
  onCancel,
  onConfirm,
}: DeleteConfirmSheetProps) {
  const surfaceColor = useThemeColor({}, 'surface');
  const borderColor = useThemeColor({}, 'surfaceBorder');
  const textColor = useThemeColor({}, 'text');
  const mutedColor = useThemeColor({}, 'textMuted');
  const dangerColor = useThemeColor({}, 'danger');
  const accentColor = useAccentColor();
  const confirmColor = tone === 'accent' ? accentColor : dangerColor;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable
          style={[styles.sheet, { backgroundColor: surfaceColor, borderColor }]}
          onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />

          <View style={styles.previewRow}>
            <View style={[styles.thumbnailWrap, { backgroundColor: 'rgba(128,128,128,0.15)' }]}>
              {thumbnailUri ? (
                <Image source={{ uri: thumbnailUri }} style={styles.thumbnail} contentFit="cover" />
              ) : (
                <Ionicons name="film-outline" size={22} color={mutedColor} />
              )}
            </View>
            <View style={styles.textBlock}>
              <Text style={[styles.title, { color: textColor }]} numberOfLines={2}>
                {title}
              </Text>
              {subtitle ? (
                <Text style={[styles.subtitle, { color: mutedColor }]} numberOfLines={2}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
          </View>

          <Text style={[styles.warning, { color: mutedColor }]}>{warningText}</Text>

          <View style={styles.actionsRow}>
            <Pressable style={styles.cancelButton} onPress={onCancel}>
              <Text style={[styles.cancelLabel, { color: textColor }]}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.confirmButton, { backgroundColor: confirmColor }]} onPress={onConfirm}>
              <Text style={styles.confirmLabel}>{confirmLabel}</Text>
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
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  thumbnailWrap: {
    width: 72,
    aspectRatio: 16 / 9,
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
  },
  subtitle: {
    fontSize: typography.size.meta,
  },
  warning: {
    fontSize: typography.size.meta,
    marginBottom: spacing.lg,
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
