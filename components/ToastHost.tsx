import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useToastStore } from '@/hooks/useToastStore';
import { radius, spacing } from '@/theme/tokens';

const VISIBLE_MS = 2200;
const FADE_MS = 180;

/** Mounted once at the root layout; renders a brief bottom banner whenever useToastStore's show() is called. */
export function ToastHost() {
  const message = useToastStore((s) => s.message);
  const token = useToastStore((s) => s.token);
  const insets = useSafeAreaInsets();
  const surfaceColor = useThemeColor({}, 'surface');
  const borderColor = useThemeColor({}, 'surfaceBorder');
  const textColor = useThemeColor({}, 'text');

  const [rendered, setRendered] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!message) {
      return;
    }
    setRendered(message);
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
    }
    opacity.stopAnimation();
    Animated.timing(opacity, { toValue: 1, duration: FADE_MS, useNativeDriver: true }).start();
    hideTimer.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: FADE_MS, useNativeDriver: true }).start(({ finished }) => {
        if (finished) {
          setRendered(null);
        }
      });
    }, VISIBLE_MS);
    return () => {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
      }
    };
    // token (not message) is the trigger — see useToastStore's comment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!rendered) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.wrap, { bottom: insets.bottom + spacing.xl, opacity }]}>
      <ThemedText
        style={[styles.pill, { backgroundColor: surfaceColor, borderColor, color: textColor }]}
        numberOfLines={2}>
        {rendered}
      </ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    alignItems: 'center',
    zIndex: 1000,
  },
  pill: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    fontSize: 13,
    textAlign: 'center',
    overflow: 'hidden',
  },
});
