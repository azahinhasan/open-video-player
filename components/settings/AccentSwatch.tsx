import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { motion, typography } from '@/theme/tokens';

type AccentSwatchProps = {
  color: string;
  label: string;
  selected: boolean;
  onPress: () => void;
};

export function AccentSwatch({ color, label, selected, onPress }: AccentSwatchProps) {
  const scale = useSharedValue(selected ? 1 : 0.88);
  const ringOpacity = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    scale.value = withSpring(selected ? 1 : 0.88, motion.spring);
    ringOpacity.value = withTiming(selected ? 1 : 0, { duration: motion.tapMs });
  }, [selected, scale, ringOpacity]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable onPress={onPress} style={styles.wrap} hitSlop={8}>
      <View style={styles.dotSlot}>
        <Animated.View style={[styles.ring, { borderColor: color }, ringStyle]} />
        <Animated.View style={[styles.dot, { backgroundColor: color }, dotStyle]} />
      </View>
      <ThemedText style={[styles.label, selected ? styles.labelSelected : null]}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 8,
  },
  dotSlot: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  ring: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
  },
  label: {
    fontSize: typography.size.micro,
    opacity: 0.6,
  },
  labelSelected: {
    opacity: 1,
    fontWeight: typography.weight.medium,
  },
});
