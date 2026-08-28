import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';
import { radius, spacing } from '@/theme/tokens';

export function Card({ children }: { children: ReactNode }) {
  const surfaceColor = useThemeColor({}, 'surface');
  const borderColor = useThemeColor({}, 'surfaceBorder');
  return <View style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});
