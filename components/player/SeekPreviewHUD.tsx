import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { formatTime } from '@/utils/formatTime';

type SeekPreviewHUDProps = {
  opacity: SharedValue<number>;
  targetSeconds: number;
  deltaSeconds: number;
};

export function SeekPreviewHUD({ opacity, targetSeconds, deltaSeconds }: SeekPreviewHUDProps) {
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const forward = deltaSeconds >= 0;

  return (
    <Animated.View style={[styles.container, style]} pointerEvents="none">
      <Ionicons name={forward ? 'play-forward' : 'play-back'} size={18} color="#fff" />
      <Text style={styles.time}>{formatTime(targetSeconds)}</Text>
      <Text style={styles.delta}>
        {forward ? '+' : '-'}
        {formatTime(Math.abs(deltaSeconds))}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -80,
    marginTop: -22,
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
