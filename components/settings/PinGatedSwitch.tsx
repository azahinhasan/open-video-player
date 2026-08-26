import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

const TRACK_WIDTH = 51;
const TRACK_HEIGHT = 31;
const THUMB_SIZE = 27;
const THUMB_MARGIN = 2;
const ANIM_MS = 150;

type PinGatedSwitchProps = {
  value: boolean;
  onPress: () => void;
  activeColor: string;
};

/**
 * Looks and sizes like the stock RN Switch, but is fully controlled by
 * `value` with no native optimistic-animation behavior of its own — used
 * anywhere a toggle's real change is gated behind an async step (here, PIN
 * verification) rather than committing immediately on press.
 *
 * RN's native Android Switch widget animates its thumb the instant it's
 * touched, independent of React's render cycle — so even with `value` bound
 * to the still-unchanged real state, the stock Switch would visibly flip
 * and then snap back once the PIN sheet appears, since the widget moves
 * before React ever gets a say. A plain Pressable + Animated.View only ever
 * moves in response to an actual `value` prop change, so it stays put until
 * the gated action (PIN verification) actually succeeds.
 */
export function PinGatedSwitch({ value, onPress, activeColor }: PinGatedSwitchProps) {
  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: withTiming(value ? activeColor : 'rgba(128,128,128,0.3)', { duration: ANIM_MS }),
  }));
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: withTiming(value ? TRACK_WIDTH - THUMB_SIZE - THUMB_MARGIN : THUMB_MARGIN, { duration: ANIM_MS }) },
    ],
  }));

  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <Animated.View style={[styles.track, trackStyle]}>
        <Animated.View style={[styles.thumb, thumbStyle]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    justifyContent: 'center',
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#fff',
  },
});
