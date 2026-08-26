import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useSubtitleStylePreferences } from '@/hooks/useSubtitleStylePreferences';
import { hexToRgba } from '@/utils/color';
import type { SubtitleCue } from '@/utils/subtitleParser';
import type { SubtitleBackgroundOpacity, SubtitleFontSize } from '@/utils/subtitleStylePreferences';

type SubtitleOverlayProps = {
  cues: SubtitleCue[];
  currentTime: number;
  visible: boolean;
  /** Distance from the bottom of the screen — the caller shifts this up while the controls bar is on screen so captions don't sit under it. */
  bottomOffset: number;
};

const FONT_SIZES: Record<SubtitleFontSize, number> = { small: 16, medium: 20, large: 26 };
const BACKGROUND_OPACITIES: Record<SubtitleBackgroundOpacity, number> = {
  off: 0,
  low: 0.35,
  medium: 0.6,
  high: 0.85,
};
const OFFSET_ANIM_MS = 220;

/** Cues are sorted by start (see parseSubtitles), so this can stop as soon as it passes currentTime. */
function findActiveCue(cues: SubtitleCue[], currentTime: number): SubtitleCue | null {
  for (const cue of cues) {
    if (currentTime >= cue.start && currentTime <= cue.end) {
      return cue;
    }
    if (cue.start > currentTime) {
      break;
    }
  }
  return null;
}

export function SubtitleOverlay({ cues, currentTime, visible, bottomOffset }: SubtitleOverlayProps) {
  const fontSize = useSubtitleStylePreferences((s) => s.fontSize);
  const bold = useSubtitleStylePreferences((s) => s.bold);
  const textColor = useSubtitleStylePreferences((s) => s.textColor);
  const backgroundColor = useSubtitleStylePreferences((s) => s.backgroundColor);
  const backgroundOpacity = useSubtitleStylePreferences((s) => s.backgroundOpacity);

  // Animates smoothly between "controls hidden" and "controls visible"
  // positions (and across orientation changes) rather than jumping.
  const animatedBottom = useSharedValue(bottomOffset);
  useEffect(() => {
    animatedBottom.value = withTiming(bottomOffset, { duration: OFFSET_ANIM_MS });
  }, [bottomOffset, animatedBottom]);
  const wrapperStyle = useAnimatedStyle(() => ({ bottom: animatedBottom.value }));

  if (!visible || cues.length === 0) {
    return null;
  }

  const activeCue = findActiveCue(cues, currentTime);
  if (!activeCue) {
    return null;
  }

  return (
    <Animated.View style={[styles.wrapper, wrapperStyle]} pointerEvents="none">
      <Animated.View
        style={[
          styles.bubble,
          { backgroundColor: hexToRgba(backgroundColor, BACKGROUND_OPACITIES[backgroundOpacity]) },
        ]}>
        <Text
          style={[
            styles.text,
            { fontSize: FONT_SIZES[fontSize], fontWeight: bold ? '700' : '400', color: textColor },
          ]}>
          {activeCue.text}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  bubble: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    maxWidth: '100%',
  },
  text: {
    textAlign: 'center',
    // Keeps captions legible over bright/busy video even with the
    // background box turned off (backgroundOpacity: 'off').
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
