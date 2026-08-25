import { Ionicons } from '@expo/vector-icons';
import * as Brightness from 'expo-brightness';
import { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { VolumeManager } from 'react-native-volume-manager';

import { BrightnessVolumeHUD } from '@/components/player/BrightnessVolumeHUD';

const COMMIT_INTERVAL_MS = 70;
const HUD_HIDE_DELAY_MS = 1000;
const DOUBLE_TAP_MAX_DELAY_MS = 250;

type GestureLayerProps = {
  onSeekBy: (deltaSeconds: number) => void;
  onToggleControls: () => void;
};

export function GestureLayer({ onSeekBy, onToggleControls }: GestureLayerProps) {
  const { height } = useWindowDimensions();

  const brightnessLevel = useSharedValue(0.5);
  const brightnessOpacity = useSharedValue(0);
  const volumeLevel = useSharedValue(0.5);
  const volumeOpacity = useSharedValue(0);
  const leftFlashOpacity = useSharedValue(0);
  const rightFlashOpacity = useSharedValue(0);

  const brightnessRef = useRef(0.5);
  const volumeRef = useRef(0.5);
  const brightnessStartRef = useRef(0.5);
  const volumeStartRef = useRef(0.5);
  const lastBrightnessCommitRef = useRef(0);
  const lastVolumeCommitRef = useRef(0);

  useEffect(() => {
    Brightness.getBrightnessAsync()
      .then((value) => {
        brightnessRef.current = value;
        brightnessLevel.value = value;
      })
      .catch(() => {});
    VolumeManager.getVolume()
      .then((result) => {
        volumeRef.current = result.volume;
        volumeLevel.value = result.volume;
      })
      .catch(() => {});
    // Only needs to run once on mount to seed the HUDs with the real current levels.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showHud = useCallback((opacity: SharedValue<number>) => {
    cancelAnimation(opacity);
    opacity.value = withTiming(1, { duration: 120 });
  }, []);

  const hideHudDelayed = useCallback((opacity: SharedValue<number>) => {
    cancelAnimation(opacity);
    opacity.value = withDelay(HUD_HIDE_DELAY_MS, withTiming(0, { duration: 250 }));
  }, []);

  const flash = useCallback((opacity: SharedValue<number>) => {
    cancelAnimation(opacity);
    opacity.value = withTiming(1, { duration: 80 }, (finished) => {
      if (finished) {
        opacity.value = withDelay(250, withTiming(0, { duration: 200 }));
      }
    });
  }, []);

  const commitBrightness = useCallback((value: number, force: boolean) => {
    const now = Date.now();
    if (!force && now - lastBrightnessCommitRef.current < COMMIT_INTERVAL_MS) {
      return;
    }
    lastBrightnessCommitRef.current = now;
    Brightness.setBrightnessAsync(value).catch(() => {});
  }, []);

  const commitVolume = useCallback((value: number, force: boolean) => {
    const now = Date.now();
    if (!force && now - lastVolumeCommitRef.current < COMMIT_INTERVAL_MS) {
      return;
    }
    lastVolumeCommitRef.current = now;
    VolumeManager.setVolume(value, { showUI: false, playSound: false }).catch(() => {});
  }, []);

  const brightnessPan = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetY([-8, 8])
    .failOffsetX([-24, 24])
    .onStart(() => {
      brightnessStartRef.current = brightnessRef.current;
      showHud(brightnessOpacity);
    })
    .onUpdate((event) => {
      const delta = -event.translationY / (height * 0.75);
      const next = Math.min(1, Math.max(0, brightnessStartRef.current + delta));
      brightnessRef.current = next;
      brightnessLevel.value = next;
      commitBrightness(next, false);
    })
    .onEnd((_event, success) => {
      if (!success) {
        return;
      }
      commitBrightness(brightnessRef.current, true);
      hideHudDelayed(brightnessOpacity);
    });

  const volumePan = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetY([-8, 8])
    .failOffsetX([-24, 24])
    .onStart(() => {
      volumeStartRef.current = volumeRef.current;
      showHud(volumeOpacity);
    })
    .onUpdate((event) => {
      const delta = -event.translationY / (height * 0.75);
      const next = Math.min(1, Math.max(0, volumeStartRef.current + delta));
      volumeRef.current = next;
      volumeLevel.value = next;
      commitVolume(next, false);
    })
    .onEnd((_event, success) => {
      if (!success) {
        return;
      }
      commitVolume(volumeRef.current, true);
      hideHudDelayed(volumeOpacity);
    });

  const leftDoubleTap = Gesture.Tap()
    .runOnJS(true)
    .numberOfTaps(2)
    .maxDelay(DOUBLE_TAP_MAX_DELAY_MS)
    .onEnd((_event, success) => {
      if (!success) {
        return;
      }
      onSeekBy(-10);
      flash(leftFlashOpacity);
    });

  const rightDoubleTap = Gesture.Tap()
    .runOnJS(true)
    .numberOfTaps(2)
    .maxDelay(DOUBLE_TAP_MAX_DELAY_MS)
    .onEnd((_event, success) => {
      if (!success) {
        return;
      }
      onSeekBy(10);
      flash(rightFlashOpacity);
    });

  const singleTap = Gesture.Tap()
    .runOnJS(true)
    .numberOfTaps(1)
    .onEnd((_event, success) => {
      if (!success) {
        return;
      }
      onToggleControls();
    });

  const leftZoneGesture = Gesture.Race(brightnessPan, Gesture.Exclusive(leftDoubleTap, singleTap));
  const rightZoneGesture = Gesture.Race(volumePan, Gesture.Exclusive(rightDoubleTap, singleTap));

  const leftFlashStyle = useAnimatedStyle(() => ({ opacity: leftFlashOpacity.value }));
  const rightFlashStyle = useAnimatedStyle(() => ({ opacity: rightFlashOpacity.value }));

  return (
    <View style={styles.root} pointerEvents="box-none">
      <GestureDetector gesture={leftZoneGesture}>
        <View style={styles.zone}>
          <Animated.View style={[styles.flash, leftFlashStyle]} pointerEvents="none">
            <Ionicons name="play-back" size={30} color="#fff" />
            <Text style={styles.flashText}>10</Text>
          </Animated.View>
        </View>
      </GestureDetector>
      <GestureDetector gesture={rightZoneGesture}>
        <View style={styles.zone}>
          <Animated.View style={[styles.flash, rightFlashStyle]} pointerEvents="none">
            <Ionicons name="play-forward" size={30} color="#fff" />
            <Text style={styles.flashText}>10</Text>
          </Animated.View>
        </View>
      </GestureDetector>

      <BrightnessVolumeHUD
        side="left"
        icon="sunny"
        level={brightnessLevel}
        opacity={brightnessOpacity}
      />
      <BrightnessVolumeHUD
        side="right"
        icon="volume-high"
        level={volumeLevel}
        opacity={volumeOpacity}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  zone: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flash: {
    alignItems: 'center',
    gap: 4,
  },
  flashText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
