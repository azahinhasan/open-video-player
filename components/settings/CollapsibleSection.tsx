import { Ionicons } from '@expo/vector-icons';
import { type ReactNode, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { radius, spacing, typography } from '@/theme/tokens';

type CollapsibleSectionProps = {
  title: string;
  children: ReactNode;
  defaultExpanded?: boolean;
};

export function CollapsibleSection({ title, children, defaultExpanded = true }: CollapsibleSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  // Undefined (unconstrained) until the card's natural height is known, so
  // the very first render measures it correctly via onLayout instead of
  // being squashed by an animated height that doesn't have a target yet.
  const [contentHeight, setContentHeight] = useState<number | undefined>(undefined);
  const progress = useSharedValue(defaultExpanded ? 1 : 0);
  const borderColor = useThemeColor({}, 'surfaceBorder');
  const surfaceColor = useThemeColor({}, 'surface');
  const mutedColor = useThemeColor({}, 'textMuted');

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    progress.value = withTiming(next ? 1 : 0, { duration: 220 });
  };

  const bodyStyle = useAnimatedStyle(() => ({
    height: contentHeight === undefined ? undefined : progress.value * contentHeight,
    opacity: progress.value,
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.value * 180}deg` }],
  }));

  return (
    <View style={styles.wrapper}>
      <Pressable style={styles.header} onPress={toggle} hitSlop={8}>
        <ThemedText style={styles.title}>{title}</ThemedText>
        <View style={[styles.divider, { backgroundColor: borderColor }]} />
        <Animated.View style={chevronStyle}>
          <Ionicons name="chevron-down" size={16} color={mutedColor} />
        </Animated.View>
      </Pressable>

      <Animated.View style={[styles.body, bodyStyle]}>
        <View
          style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}
          onLayout={(event) => {
            const measured = event.nativeEvent.layout.height;
            if (measured > 0 && measured !== contentHeight) {
              setContentHeight(measured);
            }
          }}>
          {children}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.size.meta,
    fontWeight: typography.weight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.6,
  },
  divider: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  body: {
    overflow: 'hidden',
  },
  card: {
    marginHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});
