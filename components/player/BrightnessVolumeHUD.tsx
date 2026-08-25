import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

type BrightnessVolumeHUDProps = {
  side: 'left' | 'right';
  icon: keyof typeof Ionicons.glyphMap;
  /** Shown instead of `icon` while `level` is at zero — e.g. a mute glyph for the volume HUD. */
  zeroIcon?: keyof typeof Ionicons.glyphMap;
  level: SharedValue<number>;
  opacity: SharedValue<number>;
};

export function BrightnessVolumeHUD({ side, icon, zeroIcon, level, opacity }: BrightnessVolumeHUDProps) {
  const [isZero, setIsZero] = useState(level.value <= 0);

  useAnimatedReaction(
    () => level.value <= 0,
    (zero, previousZero) => {
      if (zero !== previousZero) {
        runOnJS(setIsZero)(zero);
      }
    },
    []
  );

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const fillStyle = useAnimatedStyle(() => ({
    height: `${level.value * 100}%`,
  }));

  const displayIcon = zeroIcon && isZero ? zeroIcon : icon;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.container, side === 'left' ? styles.left : styles.right, containerStyle]}>
      <Ionicons name={displayIcon} size={20} color="#fff" style={styles.icon} />
      <View style={styles.track}>
        <Animated.View style={[styles.fill, fillStyle]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '50%',
    marginTop: -70,
    width: 44,
    height: 140,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    paddingVertical: 10,
  },
  left: {
    left: 24,
  },
  right: {
    right: 24,
  },
  icon: {
    marginBottom: 8,
  },
  track: {
    flex: 1,
    width: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
});
