import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

type BrightnessVolumeHUDProps = {
  side: 'left' | 'right';
  icon: keyof typeof Ionicons.glyphMap;
  level: SharedValue<number>;
  opacity: SharedValue<number>;
};

export function BrightnessVolumeHUD({ side, icon, level, opacity }: BrightnessVolumeHUDProps) {
  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const fillStyle = useAnimatedStyle(() => ({
    height: `${level.value * 100}%`,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.container, side === 'left' ? styles.left : styles.right, containerStyle]}>
      <Ionicons name={icon} size={20} color="#fff" style={styles.icon} />
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
