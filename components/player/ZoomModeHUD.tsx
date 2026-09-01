import { StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

type ZoomModeHUDProps = {
  opacity: SharedValue<number>;
  label: string;
};

/**
 * Dead center of the full screen — rendered directly by PlayerScreen (not
 * nested inside GestureLayer's bottomInset-shrunk root, unlike the other
 * gesture HUDs), so it has no equivalent "shrunk box" to correct for and
 * simply centers on the real screen by construction.
 */
export function ZoomModeHUD({ opacity, label }: ZoomModeHUDProps) {
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[styles.wrapper, style]} pointerEvents="none">
      <Text style={styles.label}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
});
