import { Ionicons } from "@expo/vector-icons";
import * as Brightness from "expo-brightness";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  runOnJS,
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
// How much finger-distance change is needed for a full fit<->fill swing —
// 1 means the fingers need to double their starting distance apart (scale
// reaching 2.0) to go from fully "fit" to fully "fill", or halve it (scale
// 0.5) to go the other way. A deliberately large gesture, not a hair-trigger.
const PINCH_ZOOM_SENSITIVITY = 1;

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
   * 0 (fit/letterboxed) to 1 (fill/cropped) — the pinch gesture below live-
   * writes into this every frame while active, and VideoPlayer reads it to
   * animate the video's container between those two shapes. Owned by the
   * parent (not local state here) because VideoPlayer needs to both read it
   * (to render) and write it (to stay in sync when the zoom mode changes
   * some other way, e.g. the toolbar button) — same shared-SharedValue
   * pattern as volumeLevel above.
   */
  zoomProgress: SharedValue<number>;
  /** Fires once, when a pinch gesture ends and settles on an endpoint — lets the parent commit the corresponding real zoomMode ('contain' at 0, 'cover' at 1) so the toolbar's cycle button picks up from the right place afterward. */
  onZoomSnap: (mode: "contain" | "cover") => void;
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
  zoomProgress,
  onZoomSnap,
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
    // Without this, the pinch gesture's simultaneousWithExternalGesture
    // (needed so pinch can activate at all — see pinchGesture below) also
    // lets a second finger landing in this zone activate brightnessPan
    // alongside the pinch, nudging brightness while zooming. maxPointers(1)
    // makes this fail to activate the moment a second finger is down.
    .maxPointers(1)
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
    // See brightnessPan's comment above — same reasoning, same fix.
    .maxPointers(1)
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
      // See brightnessPan's comment above — same reasoning: without this, a
      // pinch's second finger landing in this zone could also activate a
      // seek-by-swipe alongside the pinch.
      .maxPointers(1)
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

  // Pinch requires two simultaneous touch points, which single-finger
  // gestures (the pans/taps above) never reach — attached as its own
  // top-level detector (see the wrapping GestureDetector below) rather than
  // folded into leftZoneGesture/rightZoneGesture, both so it can span both
  // zones at once (a pinch naturally has one finger in each) and so it
  // can't disturb those already-tuned single-finger Race/Exclusive trees.
  // simultaneousWithExternalGesture is required, not optional: nested
  // GestureDetectors don't cooperate by default in RNGH — without this, the
  // inner zone gestures silently claim the touches first and the pinch
  // never gets a chance to activate at all.
  const pinchStartProgress = useSharedValue(0);
  const pinchGesture = Gesture.Pinch()
    // leftZoneGesture/rightZoneGesture are ComposedGesture (Gesture.Race),
    // which simultaneousWithExternalGesture doesn't accept directly —
    // toGestureArray() flattens a composition down to its underlying raw
    // gestures, which it does accept.
    .simultaneousWithExternalGesture(
      ...leftZoneGesture.toGestureArray(),
      ...rightZoneGesture.toGestureArray(),
    )
    // maxPointers(1) on the pans (above) stops them from activating once a
    // second finger is already down, but doesn't retroactively cancel one
    // that activated from just the FIRST finger, a moment before the
    // second one registers — which a pinch's natural spreading motion can
    // easily satisfy (especially leftSeekPan/rightSeekPan's horizontal
    // threshold, since spreading fingers apart is itself a mostly-
    // horizontal motion). blocksExternalGesture makes each of these
    // explicitly wait for the pinch to fail (i.e. confirm it's NOT a
    // 2-finger gesture) before they're allowed to activate at all, closing
    // that gap. Reversed relation of requireExternalGestureToFail — one
    // call here instead of one on each of the four gestures.
    .blocksExternalGesture(brightnessPan, volumePan, leftSeekPan, rightSeekPan)
    .onStart(() => {
      pinchStartProgress.value = zoomProgress.value;
    })
    .onUpdate((event) => {
      const next =
        pinchStartProgress.value + (event.scale - 1) / PINCH_ZOOM_SENSITIVITY;
      zoomProgress.value = Math.min(1, Math.max(0, next));
    })
    .onEnd((_event, success) => {
      if (!success) {
        return;
      }
      const snapped = zoomProgress.value > 0.5 ? 1 : 0;
      zoomProgress.value = withTiming(snapped, { duration: 220 });
      runOnJS(onZoomSnap)(snapped === 1 ? "cover" : "contain");
    });

  const playPauseFlashStyle = useAnimatedStyle(() => ({
    opacity: playPauseFlashOpacity.value,
  }));

  return (
    <GestureDetector gesture={pinchGesture}>
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
    </GestureDetector>
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
