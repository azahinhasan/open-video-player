import { StyleSheet } from 'react-native';

import { spacing, typography } from '@/theme/tokens';

/** Shared across the settings index and every detail page, so row/control layout stays visually identical regardless of which page it's rendered on. */
export const settingsStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.lg,
  },
  controlBlock: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  controlLabel: {
    fontSize: typography.size.meta,
    opacity: 0.6,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowLabel: {
    fontSize: typography.size.body,
  },
  rowSpacer: {
    flex: 1,
  },
  hint: {
    fontSize: typography.size.micro,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    marginTop: -spacing.sm,
  },
  colorSwatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
