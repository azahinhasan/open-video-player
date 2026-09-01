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
  /**
   * Same fix as GestureLayer's own center flash: this HUD lives inside
   * GestureLayer's root, whose bottom edge is pulled up by bottomInset
   * while the controls bar is showing (to keep its touch zones off the
   * seek bar) — centering naively within that shortened box would put the
   * HUD visibly above true screen-center whenever controls are visible.
   * Reaching back past root's own bottom edge by this amount keeps it
   * centered on the real screen regardless.
   */
  bottomInset?: number;
};

export function BrightnessVolumeHUD({
  side,
  icon,
  zeroIcon,
  level,
  opacity,
  bottomInset = 0,
}: BrightnessVolumeHUDProps) {
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

  const boxStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const fillStyle = useAnimatedStyle(() => ({
    height: `${level.value * 100}%`,
  }));

  const displayIcon = zeroIcon && isZero ? zeroIcon : icon;

  return (
    <View
      pointerEvents="none"
      style={[styles.wrapper, side === 'left' ? styles.left : styles.right, { bottom: -bottomInset }]}>
      <Animated.View style={[styles.box, boxStyle]}>
        <Ionicons name={displayIcon} size={20} color="#fff" style={styles.icon} />
        <View style={styles.track}>
          <Animated.View style={[styles.fill, fillStyle]} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    justifyContent: 'center',
  },
  left: {
    left: 24,
  },
  right: {
    right: 24,
  },
  box: {
    width: 44,
    height: 140,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    paddingVertical: 10,
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
