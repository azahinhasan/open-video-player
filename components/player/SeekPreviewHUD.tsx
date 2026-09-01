import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { formatTime } from '@/utils/formatTime';

type SeekPreviewHUDProps = {
  opacity: SharedValue<number>;
  targetSeconds: number;
  deltaSeconds: number;
  /**
   * Same fix as GestureLayer's own center flash / BrightnessVolumeHUD: this
   * HUD lives inside GestureLayer's root, whose bottom edge is pulled up by
   * bottomInset while the controls bar is showing — centering naively
   * within that shortened box would put this HUD visibly above true
   * screen-center whenever controls are visible while swipe-seeking.
   */
  bottomInset?: number;
};

export function SeekPreviewHUD({ opacity, targetSeconds, deltaSeconds, bottomInset = 0 }: SeekPreviewHUDProps) {
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const forward = deltaSeconds >= 0;

  return (
    <View style={[styles.wrapper, { bottom: -bottomInset }]} pointerEvents="none">
      <Animated.View style={[styles.container, style]}>
        <Ionicons name={forward ? 'play-forward' : 'play-back'} size={18} color="#fff" />
        <Text style={styles.time}>{formatTime(targetSeconds)}</Text>
        <Text style={styles.delta}>
          {forward ? '+' : '-'}
          {formatTime(Math.abs(deltaSeconds))}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    width: 160,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  time: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  delta: {
    color: '#ccc',
    fontSize: 12,
  },
});
