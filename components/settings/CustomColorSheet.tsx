import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { radius, spacing, typography } from '@/theme/tokens';
import { hexToHsl, hslToHex } from '@/utils/color';

const LIGHTNESS = 52;
const HUE_STRIPS = Array.from({ length: 24 }, (_, i) => `hsl(${Math.round((i / 23) * 360)}, 100%, 50%)`);

type GradientSliderProps = {
  colors: string[];
  value: number;
  onChange: (fraction: number) => void;
};

function GradientSlider({ colors, value, onChange }: GradientSliderProps) {
  const width = useSharedValue(0);
  const fraction = useSharedValue(value);

  useEffect(() => {
    fraction.value = value;
  }, [value, fraction]);

  const commit = useCallback((v: number) => onChange(v), [onChange]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .minDistance(0)
        .onBegin((event) => {
          const w = width.value || 1;
          const v = Math.min(1, Math.max(0, event.x / w));
          fraction.value = v;
          commit(v);
        })
        .onUpdate((event) => {
          const w = width.value || 1;
          const v = Math.min(1, Math.max(0, event.x / w));
          fraction.value = v;
          commit(v);
        }),
    [commit, width, fraction]
  );

  const handleLayout = (event: LayoutChangeEvent) => {
    width.value = event.nativeEvent.layout.width;
  };

  const thumbStyle = useAnimatedStyle(() => ({
    left: `${fraction.value * 100}%`,
  }));

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.sliderTrack} onLayout={handleLayout}>
        <View style={styles.stripRow}>
          {colors.map((c, i) => (
            <View key={i} style={[styles.strip, { backgroundColor: c }]} />
          ))}
        </View>
        <Animated.View style={[styles.thumb, thumbStyle]} />
      </View>
    </GestureDetector>
  );
}

type CustomColorSheetProps = {
  visible: boolean;
  initialColor: string;
  onCancel: () => void;
  onConfirm: (hex: string) => void;
};

export function CustomColorSheet({ visible, initialColor, onCancel, onConfirm }: CustomColorSheetProps) {
  const surfaceColor = useThemeColor({}, 'surface');
  const borderColor = useThemeColor({}, 'surfaceBorder');
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(70);

  useEffect(() => {
    if (visible) {
      const { h, s } = hexToHsl(initialColor);
      setHue(h);
      setSaturation(s);
    }
  }, [visible, initialColor]);

  const previewHex = useMemo(() => hslToHex(hue, saturation, LIGHTNESS), [hue, saturation]);
  const saturationStrips = useMemo(
    () => Array.from({ length: 12 }, (_, i) => `hsl(${hue}, ${Math.round((i / 11) * 100)}%, ${LIGHTNESS}%)`),
    [hue]
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable
          style={[styles.sheet, { backgroundColor: surfaceColor, borderColor }]}
          onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />

          <View style={styles.previewRow}>
            <View style={[styles.previewDot, { backgroundColor: previewHex }]} />
            <ThemedText style={styles.previewHex}>{previewHex.toUpperCase()}</ThemedText>
          </View>

          <ThemedText style={styles.sliderLabel}>Hue</ThemedText>
          <GradientSlider colors={HUE_STRIPS} value={hue / 360} onChange={(f) => setHue(Math.round(f * 360))} />

          <ThemedText style={styles.sliderLabel}>Saturation</ThemedText>
          <GradientSlider
            colors={saturationStrips}
            value={saturation / 100}
            onChange={(f) => setSaturation(Math.round(f * 100))}
          />

          <View style={styles.actionsRow}>
            <Pressable style={styles.cancelButton} onPress={onCancel}>
              <ThemedText style={styles.cancelLabel}>Cancel</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.confirmButton, { backgroundColor: previewHex }]}
              onPress={() => onConfirm(previewHex)}>
              <Text style={styles.confirmLabel}>Use this color</Text>
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
    marginBottom: spacing.lg,
  },
  previewDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  previewHex: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
  },
  sliderLabel: {
    fontSize: typography.size.meta,
    opacity: 0.6,
    marginBottom: spacing.sm,
  },
  sliderTrack: {
    height: 32,
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  stripRow: {
    flexDirection: 'row',
    height: 14,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  strip: {
    flex: 1,
    height: '100%',
  },
  thumb: {
    position: 'absolute',
    top: 2,
    width: 28,
    height: 28,
    marginLeft: -14,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.15)',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
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
    opacity: 0.8,
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
