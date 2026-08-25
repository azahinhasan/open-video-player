import { useEffect } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { useAccentColor } from '@/hooks/useThemePreference';
import { motion, radius, typography } from '@/theme/tokens';

type SegmentedControlProps<T extends string> = {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  const accentColor = useAccentColor();
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value)
  );
  const segmentWidth = useSharedValue(0);
  const translateX = useSharedValue(0);

  useEffect(() => {
    translateX.value = withTiming(selectedIndex * segmentWidth.value, { duration: motion.tapMs });
  }, [selectedIndex, segmentWidth, translateX]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width / options.length;
    segmentWidth.value = width;
    translateX.value = selectedIndex * width;
  };

  const thumbStyle = useAnimatedStyle(() => ({
    width: segmentWidth.value,
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={styles.track} onLayout={handleLayout}>
      <Animated.View style={[styles.thumb, { backgroundColor: accentColor }, thumbStyle]} />
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable key={option.value} style={styles.segment} onPress={() => onChange(option.value)}>
            <ThemedText style={[styles.label, selected ? styles.labelSelected : null]}>{option.label}</ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: radius.full,
    backgroundColor: 'rgba(128,128,128,0.14)',
    padding: 3,
  },
  thumb: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 0,
    borderRadius: radius.full,
  },
  segment: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: typography.size.meta,
    fontWeight: typography.weight.regular,
    opacity: 0.7,
  },
  labelSelected: {
    opacity: 1,
    fontWeight: typography.weight.medium,
  },
});
