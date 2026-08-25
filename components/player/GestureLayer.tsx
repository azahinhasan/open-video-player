import { Ionicons } from '@expo/vector-icons';
import * as Brightness from 'expo-brightness';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import { SeekPreviewHUD } from '@/components/player/SeekPreviewHUD';

const COMMIT_INTERVAL_MS = 70;
const HUD_HIDE_DELAY_MS = 1000;
const DOUBLE_TAP_MAX_DELAY_MS = 250;
const SEEK_PIXELS_PER_SECOND = 8;

type GestureLayerProps = {
  currentTime: number;
  duration: number;
  /**
   * Shared with the mute button in ControlsOverlay so both always reflect
   * the same media volume — see app/player/[id].tsx for why this can't just
   * be owned locally (self-triggered volume changes don't reliably echo
   * back through the native "volume changed" listener).
   */
  volumeLevel: SharedValue<number>;
  onSeekBy: (deltaSeconds: number) => void;
  onSeekTo: (time: number) => void;
  onToggleControls: () => void;
  /**
   * Height, in points, to leave uncovered at the bottom of the screen.
   * The Chapter Rail lives there and has its own GestureDetector — without
   * this gap, this component's full-screen zones compete with it for quick
   * taps (a sustained drag on the rail wins the race easily, but a tap is a
   * genuine coin flip between the two independent gesture trees). Pass 0
   * when the bottom bar isn't actually on screen (controls hidden) so this
   * layer reclaims full-height coverage for tap-to-reveal.
   */
  bottomInset?: number;
};

export function GestureLayer({
  currentTime,
  duration,
  volumeLevel,
  onSeekBy,
  onSeekTo,
  onToggleControls,
  bottomInset = 0,
}: GestureLayerProps) {
  const { height } = useWindowDimensions();

  const brightnessLevel = useSharedValue(0.5);
  const brightnessOpacity = useSharedValue(0);
  const volumeOpacity = useSharedValue(0);
  const leftFlashOpacity = useSharedValue(0);
  const rightFlashOpacity = useSharedValue(0);
  const seekOpacity = useSharedValue(0);

  const brightnessRef = useRef(0.5);
  const brightnessStartRef = useRef(0.5);
  const volumeStartRef = useRef(0.5);
  const lastBrightnessCommitRef = useRef(0);
  const lastVolumeCommitRef = useRef(0);

  const currentTimeRef = useRef(currentTime);
  const durationRef = useRef(duration);
  const seekStartRef = useRef(0);
  const [seekPreview, setSeekPreview] = useState({ targetSeconds: 0, deltaSeconds: 0 });

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  useEffect(() => {
    Brightness.getBrightnessAsync()
      .then((value) => {
        brightnessRef.current = value;
        brightnessLevel.value = value;
      })
      .catch(() => {});
    // Volume itself is fetched/synced by the parent (app/player/[id].tsx)
    // into the shared volumeLevel prop, so it stays correct even when the
    // mute button changes it while this gesture isn't active.
    // Only needs to run once on mount to seed brightness with its real level.
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

  const computeSeek = useCallback((translationX: number) => {
    const delta = translationX / SEEK_PIXELS_PER_SECOND;
    const maxTime = durationRef.current || Infinity;
    const target = Math.min(maxTime, Math.max(0, seekStartRef.current + delta));
    return { target, delta: target - seekStartRef.current };
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
      volumeStartRef.current = volumeLevel.value;
      showHud(volumeOpacity);
    })
    .onUpdate((event) => {
      const delta = -event.translationY / (height * 0.75);
      const next = Math.min(1, Math.max(0, volumeStartRef.current + delta));
      volumeLevel.value = next;
      commitVolume(next, false);
    })
    .onEnd((_event, success) => {
      if (!success) {
        return;
      }
      commitVolume(volumeLevel.value, true);
      hideHudDelayed(volumeOpacity);
    });

  const createSeekPan = () =>
    Gesture.Pan()
      .runOnJS(true)
      .activeOffsetX([-10, 10])
      .failOffsetY([-24, 24])
      .onStart(() => {
        seekStartRef.current = currentTimeRef.current;
        setSeekPreview({ targetSeconds: currentTimeRef.current, deltaSeconds: 0 });
        showHud(seekOpacity);
      })
      .onUpdate((event) => {
        const { target, delta } = computeSeek(event.translationX);
        setSeekPreview({ targetSeconds: target, deltaSeconds: delta });
      })
      .onEnd((event, success) => {
        if (!success) {
          return;
        }
        const { target } = computeSeek(event.translationX);
        onSeekTo(target);
        hideHudDelayed(seekOpacity);
      });

  const leftSeekPan = createSeekPan();
  const rightSeekPan = createSeekPan();

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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
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

  const leftZoneGesture = Gesture.Race(
    brightnessPan,
    leftSeekPan,
    Gesture.Exclusive(leftDoubleTap, singleTap)
  );
  const rightZoneGesture = Gesture.Race(
    volumePan,
    rightSeekPan,
    Gesture.Exclusive(rightDoubleTap, singleTap)
  );

  const leftFlashStyle = useAnimatedStyle(() => ({ opacity: leftFlashOpacity.value }));
  const rightFlashStyle = useAnimatedStyle(() => ({ opacity: rightFlashOpacity.value }));

  return (
    <View style={[styles.root, { bottom: bottomInset }]} pointerEvents="box-none">
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
        zeroIcon="volume-mute"
        level={volumeLevel}
        opacity={volumeOpacity}
      />
      <SeekPreviewHUD
        opacity={seekOpacity}
        targetSeconds={seekPreview.targetSeconds}
        deltaSeconds={seekPreview.deltaSeconds}
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
