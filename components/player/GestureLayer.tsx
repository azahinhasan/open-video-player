import { Ionicons } from "@expo/vector-icons";
import * as Brightness from "expo-brightness";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { VolumeManager } from "react-native-volume-manager";

import { BrightnessVolumeHUD } from "@/components/player/BrightnessVolumeHUD";
import { SeekPreviewHUD } from "@/components/player/SeekPreviewHUD";

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
  /** Whether playback is currently paused — used only to pick which icon the double-tap flash shows (the state it's about to switch to). */
  paused: boolean;
  onSeekTo: (time: number) => void;
  onToggleControls: () => void;
  /** Fires on a double-tap anywhere in either zone — toggles play/pause. Deliberately not tied to which side was tapped: double-tap no longer seeks (swipe does that; see onSeekTo), so there's nothing left for left vs. right to distinguish. */
  onTogglePlayPause: () => void;
  /** Called the instant a seek-drag begins, so the controls bar (progress bar, transport buttons) is already on screen for the whole drag — not just revealed reactively once the drag ends and onSeekTo commits. */
  onShowControls: () => void;
  /**
   * Height, in points, to leave uncovered at the bottom of the screen.
   * The SeekBar lives there and has its own GestureDetector — without
   * this gap, this component's full-screen zones compete with it for quick
   * taps (a sustained drag on the seek bar wins the race easily, but a tap is a
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
  paused,
  onSeekTo,
  onToggleControls,
  onTogglePlayPause,
  onShowControls,
  bottomInset = 0,
}: GestureLayerProps) {
  const { height } = useWindowDimensions();

  const brightnessLevel = useSharedValue(0.5);
  const brightnessOpacity = useSharedValue(0);
  const volumeOpacity = useSharedValue(0);
  // One shared flash for the double-tap play/pause icon, rendered dead
  // center of the whole screen (see the render below) — not per-zone,
  // since double-tap does the same thing regardless of which side was
  // tapped, so the feedback shouldn't appear off to one side either.
  const playPauseFlashOpacity = useSharedValue(0);
  const seekOpacity = useSharedValue(0);

  const brightnessRef = useRef(0.5);
  const brightnessStartRef = useRef(0.5);
  const volumeStartRef = useRef(0.5);
  const lastBrightnessCommitRef = useRef(0);
  const lastVolumeCommitRef = useRef(0);

  const currentTimeRef = useRef(currentTime);
  const durationRef = useRef(duration);
  const seekStartRef = useRef(0);
  const [seekPreview, setSeekPreview] = useState({
    targetSeconds: 0,
    deltaSeconds: 0,
  });

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
    opacity.value = withDelay(
      HUD_HIDE_DELAY_MS,
      withTiming(0, { duration: 250 }),
    );
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
    VolumeManager.setVolume(value, { showUI: false, playSound: false }).catch(
      () => {},
    );
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
        setSeekPreview({
          targetSeconds: currentTimeRef.current,
          deltaSeconds: 0,
        });
        showHud(seekOpacity);
        onShowControls();
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
      onTogglePlayPause();
      flash(playPauseFlashOpacity);
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
      onTogglePlayPause();
      flash(playPauseFlashOpacity);
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
    Gesture.Exclusive(leftDoubleTap, singleTap),
  );
  const rightZoneGesture = Gesture.Race(
    volumePan,
    rightSeekPan,
    Gesture.Exclusive(rightDoubleTap, singleTap),
  );

  const playPauseFlashStyle = useAnimatedStyle(() => ({
    opacity: playPauseFlashOpacity.value,
  }));

  return (
    <View
      style={[styles.root, { bottom: bottomInset }]}
      pointerEvents="box-none"
    >
      <GestureDetector gesture={leftZoneGesture}>
        <View style={styles.zone} />
      </GestureDetector>
      <GestureDetector gesture={rightZoneGesture}>
        <View style={styles.zone} />
      </GestureDetector>

      {/* Dead center of the true full screen regardless of which zone was
          double-tapped, regardless of orientation, AND regardless of
          whether the controls bar is showing — bottom: -bottomInset
          deliberately reaches back past root's own bottom edge (root is
          shortened by bottomInset above, to keep its touch zones off the
          seek bar), so this doesn't end up centered in that shortened
          box and sit visibly above true center whenever controls are
          visible. */}
      <Animated.View
        style={[
          styles.centerFlash,
          { bottom: -bottomInset },
          playPauseFlashStyle,
        ]}
        pointerEvents="none"
      >
        <View style={styles.centerFlashIcon}>
          <Ionicons name={paused ? "play" : "pause"} size={36} color="#fff" />
        </View>
      </Animated.View>

      <BrightnessVolumeHUD
        side="left"
        icon="sunny"
        level={brightnessLevel}
        opacity={brightnessOpacity}
        bottomInset={bottomInset}
      />
      <BrightnessVolumeHUD
        side="right"
        icon="volume-high"
        zeroIcon="volume-mute"
        level={volumeLevel}
        opacity={volumeOpacity}
        bottomInset={bottomInset}
      />
      <SeekPreviewHUD
        opacity={seekOpacity}
        targetSeconds={seekPreview.targetSeconds}
        deltaSeconds={seekPreview.deltaSeconds}
        bottomInset={bottomInset}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
  },
  zone: {
    flex: 1,
  },
  centerFlash: {
    // bottom is applied inline (see the render above) — it depends on the
    // runtime bottomInset prop, not a fixed value.
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  centerFlashIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
});
