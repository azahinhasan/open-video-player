import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { Directory, File, Paths } from "expo-file-system";
import { useKeepAwake } from "expo-keep-awake";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  AppState,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  cancelAnimation,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type {
  AudioTrack,
  OnAudioTracksData,
  OnBufferData,
  OnLoadData,
  OnProgressData,
  OnVideoErrorData,
  VideoRef,
} from "react-native-video";
import { VolumeManager } from "react-native-volume-manager";

import { ControlsOverlay } from "@/components/player/ControlsOverlay";
import { GestureLayer } from "@/components/player/GestureLayer";
import { SubtitleOverlay } from "@/components/player/SubtitleOverlay";
import {
  VideoPlayer,
  type VideoZoomMode,
} from "@/components/player/VideoPlayer";
import { ZoomModeHUD } from "@/components/player/ZoomModeHUD";
import { useImmersiveMode } from "@/hooks/useImmersiveMode";
import { useOrientationLock } from "@/hooks/useOrientationLock";
import { usePlaybackPreferences } from "@/hooks/usePlaybackPreferences";
import { adjacentVideoId, usePlaybackStore } from "@/hooks/usePlaybackStore";
import { useAccentColor } from "@/hooks/useThemePreference";
import type { VideoAsset } from "@/types/video";
import type { SubtitleCue } from "@/utils/subtitleParser";
import {
  findSidecarSubtitle,
  isSubtitleFilename,
  loadSubtitleCues,
} from "@/utils/subtitles";

const AUTO_HIDE_DELAY_MS = 2000;
const ZOOM_CYCLE: VideoZoomMode[] = ["contain", "cover", "stretch"];
const ZOOM_MODE_LABELS: Record<VideoZoomMode, string> = {
  contain: "Fit",
  cover: "Fill",
  stretch: "Stretch",
};
const ZOOM_FLASH_VISIBLE_MS = 900;
// Generously covers the SeekBar's touch area plus the time row beneath
// it, so GestureLayer's full-screen zones don't compete with the seek bar's
// own gesture for taps while the bottom bar is actually on screen. When the
// transport buttons also live down there (controlsLayout: 'bottom'), the
// zone needs to grow to cover that extra row too, for the same reason.
const BOTTOM_CONTROLS_TOUCH_HEIGHT_CENTER = 110;
const BOTTOM_CONTROLS_TOUCH_HEIGHT_WITH_TRANSPORT = 190;
// Picture-in-Picture needs API 26 (Android 8.0) — Platform.Version on Android
// is the SDK int directly, so this hides the button on unsupported devices
// instead of leaving a control that silently no-ops.
const PIP_SUPPORTED = Platform.OS === "android" && Platform.Version >= 26;
// Small clearance above the safe area when the controls bar is hidden, and
// above the controls bar itself (plus its own safe-area padding) when it's
// visible — computed from insets.bottom rather than a flat constant so this
// lands correctly in both portrait and landscape (landscape's safe-area
// insets differ, and a flat offset was proportionally too large there).
const SUBTITLE_BASE_GAP = 20;
const SUBTITLE_CONTROLS_GAP = 8;

// Resolves the position playback should start/display at, synchronously —
// used to seed currentTime's initial state (and the VideoPlayer's
// startPositionSeconds prop) so the very first render already shows the
// resumed position instead of 0:00, which would otherwise flash briefly
// before the real value arrives from the native onProgress callback.
function resolveResumeSeconds(video: VideoAsset | null): number {
  if (!video) {
    return 0;
  }
  if (usePlaybackPreferences.getState().resumeBehavior === "restart") {
    return 0;
  }
  return usePlaybackStore.getState().positionFor(video.id);
}

// Orientation the player screen locks into as soon as it mounts, driven by
// the user's "Default orientation" setting — read synchronously (not via a
// hook + effect) so the very first lockAsync call already targets the
// right orientation instead of starting portrait and flipping a moment
// later for users who set landscape as their default.
function resolveDefaultOrientationLock(): ScreenOrientation.OrientationLock {
  return usePlaybackPreferences.getState().defaultOrientation === "landscape"
    ? ScreenOrientation.OrientationLock.LANDSCAPE
    : ScreenOrientation.OrientationLock.PORTRAIT_UP;
}

type PlayerScreenProps = {
  /**
   * Route prefix used for next/prev navigation and autoplay-next
   * (router.replace(`${playerBasePath}/${id}`)). Defaults to the regular
   * top-level player. The vault's nested player route passes
   * '/vault/player' so navigating within a vaulted video's queue stays
   * inside the vault's route tree (and therefore its lock/re-lock
   * boundary) instead of escaping to the unprotected top-level player.
   */
  playerBasePath?: "/player" | "/vault/player";
};

export function PlayerScreen({
  playerBasePath = "/player",
}: PlayerScreenProps) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queue = usePlaybackStore((s) => s.queue);
  const paused = usePlaybackStore((s) => s.paused);
  const play = usePlaybackStore((s) => s.play);
  const togglePlayPause = usePlaybackStore((s) => s.togglePlayPause);
  const savePosition = usePlaybackStore((s) => s.savePosition);

  const video = queue.find((v) => v.id === id) ?? null;
  const videoRef = useRef<VideoRef>(null);
  const accentColor = useAccentColor();
  const insets = useSafeAreaInsets();
  const controlsLayout = usePlaybackPreferences((s) => s.controlsLayout);
  const bottomControlsTouchHeight =
    controlsLayout === "bottom"
      ? BOTTOM_CONTROLS_TOUCH_HEIGHT_WITH_TRANSPORT
      : BOTTOM_CONTROLS_TOUCH_HEIGHT_CENTER;

  const [duration, setDuration] = useState(() => video?.duration ?? 0);
  const [currentTime, setCurrentTime] = useState(() =>
    resolveResumeSeconds(video),
  );
  // False from the moment a video is opened until VideoPlayer's picture is
  // actually visually accurate (see handlePictureReady) — audio/playback
  // itself isn't gated on this (see VideoPlayer's POSTER_HIDE_DELAY_MS
  // comment for why that turned out not to work), so this only gates
  // displayTime below, keeping the timer/seek bar from visibly ticking
  // ahead of a still-black or still-poster-covered picture; internal logic
  // (seeking, saving position) keeps using the real currentTime state,
  // which updates immediately regardless.
  const [pictureReady, setPictureReady] = useState(false);
  // Resets pictureReady synchronously during render (not in an effect) the
  // instant `id` changes, so a new video never briefly renders with the
  // previous video's already-true pictureReady before its own reset effect
  // gets a chance to run.
  const pictureReadyVideoIdRef = useRef<string | null>(null);
  if (pictureReadyVideoIdRef.current !== id) {
    pictureReadyVideoIdRef.current = id ?? null;
    if (pictureReady) {
      setPictureReady(false);
    }
  }
  const [buffering, setBuffering] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [orientationLock, setOrientationLock] = useState(
    resolveDefaultOrientationLock,
  );
  // Derived from the LIVE screen size, not orientationLock — orientationLock
  // flips the instant the rotate button is pressed (it's what drives
  // useOrientationLock's lockAsync call below), well before the physical
  // rotation actually finishes. ControlsOverlay's padding is computed from
  // insets, which only update once the real rotation completes — so if its
  // isLandscape prop flipped on that same earlier button-press timing, the
  // padding briefly used the NEW isLandscape against the OLD insets (a
  // mismatched, wrong-looking value) before settling once insets caught up:
  // a visible double-step "jump early, then jump again" instead of one
  // smooth change. useWindowDimensions updates on the same native-rotation
  // timing insets do, so deriving isLandscape from it instead keeps the two
  // always in sync.
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isLandscape = windowWidth > windowHeight;
  const [locked, setLocked] = useState(false);
  const [rate, setRate] = useState(1);
  const [loop, setLoop] = useState(false);
  const [zoomMode, setZoomMode] = useState<VideoZoomMode>("contain");
  // 0 (fit) to 1 (fill) — shared with GestureLayer (which live-writes to it
  // during a pinch) and VideoPlayer (which reads it to animate the video's
  // container, and also writes to it to stay in sync when zoomMode changes
  // some other way, e.g. handleZoomSnap below or the toolbar cycle button).
  const zoomProgress = useSharedValue(zoomMode === "cover" ? 1 : 0);
  const zoomFlashOpacity = useSharedValue(0);
  // Triggered explicitly from handleCycleZoomMode and handleZoomSnap below
  // — not from a zoomMode-watching effect, since zoomMode also resets to
  // "contain" on every video change (see the [id] effect further down),
  // which isn't a user-triggered zoom change and shouldn't flash the mode
  // name.
  const flashZoomMode = useCallback(() => {
    cancelAnimation(zoomFlashOpacity);
    zoomFlashOpacity.value = withTiming(1, { duration: 120 }, (finished) => {
      if (finished) {
        zoomFlashOpacity.value = withDelay(
          ZOOM_FLASH_VISIBLE_MS,
          withTiming(0, { duration: 250 }),
        );
      }
    });
  }, [zoomFlashOpacity]);
  const handleZoomSnap = useCallback(
    (mode: "contain" | "cover") => {
      setZoomMode(mode);
      flashZoomMode();
    },
    [flashZoomMode],
  );
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  const [subtitleCues, setSubtitleCues] = useState<SubtitleCue[]>([]);
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [selectedAudioTrackIndex, setSelectedAudioTrackIndex] = useState<
    number | null
  >(null);
  const [pipActive, setPipActive] = useState(false);
  // Bumped to force VideoPlayer to fully remount (a fresh native player
  // instance) when recovering from a fatal playback error — ExoPlayer's
  // error state needs a new source, not just a prop change, to clear.
  const [reloadToken, setReloadToken] = useState(0);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guards against a slow subtitle-file read resolving after a newer
  // request (rapid video switching, or picking a file right before
  // switching videos) and overwriting the cues with stale results.
  const subtitleRequestIdRef = useRef<string | null>(null);

  const hasManualSubtitleOverride = usePlaybackStore((s) =>
    id ? s.subtitleOverrides[id] !== undefined : false,
  );

  // Single source of truth for media volume, shared between GestureLayer's
  // swipe gesture and the mute button — both read/write this same value so
  // muting always reflects immediately everywhere, instead of each side
  // caching its own copy and waiting on a native "volume changed" event that
  // never actually echoes back for changes the app itself triggered.
  const volumeLevel = useSharedValue(0.5);
  // Plain (non-Reanimated) mirror of volumeLevel <= 0 — VideoPlayer isn't
  // Reanimated-aware, so it needs a normal prop it can react to. Driving
  // the video's own `muted` from this directly (rather than counting on
  // system media volume actually reaching audible zero) is what makes
  // muting reliable regardless of OS/device volume-service quirks; system
  // volume is still zeroed too, below, since that's expected independently.
  const [volumeMuted, setVolumeMuted] = useState(() => volumeLevel.value <= 0);

  useEffect(() => {
    VolumeManager.getVolume()
      .then((result) => {
        volumeLevel.value = result.volume;
        setVolumeMuted(result.volume <= 0);
      })
      .catch(() => {});
    // The native event also fires for non-media streams (ring, notification,
    // alarm, system, call) — ignore anything that isn't the music stream, or
    // it'll get treated as if playback volume itself changed.
    const subscription = VolumeManager.addVolumeListener((result) => {
      if (result.type && result.type !== "music") {
        return;
      }
      volumeLevel.value = result.volume;
      setVolumeMuted(result.volume <= 0);
    });
    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setVolume = useCallback(
    (value: number) => {
      const clamped = Math.min(1, Math.max(0, value));
      volumeLevel.value = clamped;
      setVolumeMuted(clamped <= 0);
      VolumeManager.setVolume(clamped, {
        showUI: false,
        playSound: false,
      }).catch(() => {});
    },
    [volumeLevel],
  );

  // Refs mirror the latest video/time/duration so the unmount cleanup and
  // AppState listener below can read fresh values without depending on them
  // (which would tear down and reinstall the listener on every progress tick).
  const currentVideoRef = useRef<VideoAsset | null>(video);
  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);

  useEffect(() => {
    currentVideoRef.current = video;
  }, [video]);
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);
  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  const persistCurrentPosition = useCallback(() => {
    const currentVideo = currentVideoRef.current;
    if (currentVideo) {
      savePosition(
        currentVideo.id,
        currentTimeRef.current,
        durationRef.current,
      );
    }
  }, [savePosition]);

  // Covers exits that don't run handleBack: the system back gesture/button
  // (which unmounts this screen without calling the on-screen back handler)
  // and simply navigating elsewhere after scrubbing without pressing pause.
  useEffect(() => {
    return () => {
      persistCurrentPosition();
    };
  }, [persistCurrentPosition]);

  // Covers backgrounding the app (home button, app switcher) mid-scrub,
  // where the screen never unmounts so the effect above wouldn't fire.
  // Also pauses playback on backgrounding — enterPictureInPictureOnLeave is
  // off (see the VideoPlayer render below), so without this the native
  // player can keep playing audio behind a backgrounded/closed app. Skipped
  // while pipActive: that's the one case backgrounding is expected to keep
  // playing, since the user explicitly chose PiP via its button.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "background" || nextState === "inactive") {
        persistCurrentPosition();
        if (!pipActive) {
          usePlaybackStore.getState().pause();
        }
      }
    });
    return () => subscription.remove();
  }, [persistCurrentPosition, pipActive]);

  useKeepAwake();
  useOrientationLock(orientationLock);

  // Hiding the system status/nav bars in lockstep with controlsVisible
  // shrinks insets.top/insets.bottom the instant they start hiding — and
  // ControlsOverlay's top/bottom bar padding is computed live from those
  // insets, so the bar's own height visibly collapses WHILE it's still
  // fading out (a separate, ~220ms opacity animation — see
  // ControlsOverlay's withTiming), instead of just fading in place.
  // Delaying the system-bar hide until just after that fade finishes means
  // the padding/height only actually changes once the bar is already
  // invisible. Showing them again stays immediate — only hiding needs this.
  const [systemBarsHidden, setSystemBarsHidden] = useState(false);
  useEffect(() => {
    if (!controlsVisible) {
      const timer = setTimeout(() => setSystemBarsHidden(true), 220);
      return () => clearTimeout(timer);
    }
    setSystemBarsHidden(false);
  }, [controlsVisible]);

  useImmersiveMode(systemBarsHidden);

  // Android's STRETCH resize mode (ExoPlayer's RESIZE_MODE_FILL) has been
  // reported to leave the video rendered at its pre-rotation size in the
  // corner of the newly-rotated container instead of filling it, rather
  // than picking up the new dimensions. "contain"/"cover" don't show this —
  // their box is recomputed fresh in JS every render from
  // screenWidth/screenHeight (see VideoPlayer's containerStyle) and handed
  // to native as a plain COVER-fill, so they aren't relying on native's own
  // resize recalculation the way stretch is. Forcing a fresh player
  // instance is the most reliable fix found for this — a brief poster
  // flash on rotation while in stretch mode, rather than a persistently
  // broken frame.
  const isFirstOrientationRef = useRef(true);
  useEffect(() => {
    if (isFirstOrientationRef.current) {
      isFirstOrientationRef.current = false;
      return;
    }
    if (zoomMode === "stretch" && video) {
      savePosition(video.id, currentTimeRef.current, durationRef.current);
      setReloadToken((t) => t + 1);
    }
    // Deliberately only orientationLock — this only cares whether stretch
    // mode happens to be active at the moment orientation actually
    // changes, not about re-running whenever zoomMode itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orientationLock]);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const scheduleAutoHide = useCallback(() => {
    clearHideTimer();
    if (usePlaybackStore.getState().paused) {
      // Nothing is playing — leave the controls up until the next interaction.
      return;
    }
    hideTimerRef.current = setTimeout(
      () => setControlsVisible(false),
      AUTO_HIDE_DELAY_MS,
    );
  }, [clearHideTimer]);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    scheduleAutoHide();
  }, [scheduleAutoHide]);

  const toggleControls = useCallback(() => {
    setControlsVisible((prev) => {
      const next = !prev;
      if (next) {
        scheduleAutoHide();
      } else {
        clearHideTimer();
      }
      return next;
    });
  }, [scheduleAutoHide, clearHideTimer]);

  const loadSubtitlesFor = useCallback((targetVideo: VideoAsset) => {
    subtitleRequestIdRef.current = targetVideo.id;
    const override =
      usePlaybackStore.getState().subtitleOverrides[targetVideo.id];
    const sourceUri = override ?? findSidecarSubtitle(targetVideo);
    if (!sourceUri) {
      setSubtitleCues([]);
      return;
    }
    loadSubtitleCues(sourceUri).then((cues) => {
      // Only apply if this is still the most recently requested video —
      // a slower earlier request finishing after a newer one shouldn't
      // clobber it.
      if (subtitleRequestIdRef.current === targetVideo.id) {
        setSubtitleCues(cues);
      }
    });
  }, []);

  useEffect(() => {
    const currentVideo = queue.find((v) => v.id === id) ?? null;
    // Seeded from known data (video metadata + saved position), not 0 — a
    // brand-new mount already does this via useState's lazy initializer,
    // but next/prev navigation reuses this same mounted screen, so this
    // effect needs to seed it the same way to avoid the same 0:00 flash.
    setDuration(currentVideo?.duration ?? 0);
    setCurrentTime(resolveResumeSeconds(currentVideo));
    setBuffering(false);
    setErrorMessage(null);
    setLocked(false);
    setRate(1);
    setLoop(false);
    setZoomMode("contain");
    setSubtitlesEnabled(true);
    setSubtitleCues([]);
    setAudioTracks([]);
    setSelectedAudioTrackIndex(null);
    // reloadToken doesn't semantically belong to a specific video — it only
    // exists to force a fresh native player instance (audio-track switch,
    // decoder error recovery) — but posterUri below keys off it being 0 to
    // decide whether this is a genuine first-mount-for-this-video. Left
    // stale from a previous video's reload, it would permanently disable
    // the poster (and the native seek/resize settling it masks) for every
    // video opened afterward.
    setReloadToken(0);

    if (currentVideo) {
      loadSubtitlesFor(currentVideo);
    }

    usePlaybackStore.getState().markViewed(id);
    play();
    showControls();
    return clearHideTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const goToVideo = useCallback(
    (targetId: string | null) => {
      if (!targetId || !video) {
        return;
      }
      savePosition(video.id, currentTime, duration);
      router.replace(
        playerBasePath === "/vault/player"
          ? `/vault/player/${targetId}`
          : `/player/${targetId}`,
      );
    },
    [video, currentTime, duration, savePosition, router, playerBasePath],
  );

  const handleEnd = useCallback(() => {
    if (!video) {
      return;
    }
    savePosition(video.id, 0, duration);
    if (!usePlaybackPreferences.getState().autoPlayNext) {
      usePlaybackStore.getState().pause();
      showControls();
      return;
    }
    const nextId = adjacentVideoId(queue, video.id, 1);
    if (nextId) {
      router.replace(
        playerBasePath === "/vault/player"
          ? `/vault/player/${nextId}`
          : `/player/${nextId}`,
      );
    }
  }, [
    video,
    queue,
    duration,
    savePosition,
    router,
    showControls,
    playerBasePath,
  ]);

  const handleLoad = useCallback((data: OnLoadData) => {
    setDuration(data.duration);
    setAudioTracks(data.audioTracks ?? []);
    // Deliberately does NOT set selectedAudioTrackIndex here — leaving it
    // null means VideoPlayer passes no explicit selectedAudioTrack override
    // at all, so the native player keeps using its own automatic default
    // selection (surfaced for display via audioTracks[].selected) rather
    // than every load re-applying an explicit override for a track that
    // was already about to play anyway.
  }, []);

  // Fires on load and again whenever the native player's own track state
  // changes (including after a selection we requested actually takes
  // effect) — keeps `selected` flags true-to-reality for the menu's
  // checkmarks regardless of whether the current track came from native
  // default selection or an explicit pick.
  const handleAudioTracksChanged = useCallback((data: OnAudioTracksData) => {
    setAudioTracks(data.audioTracks ?? []);
  }, []);

  const handleSelectAudioTrack = useCallback((index: number) => {
    setSelectedAudioTrackIndex(index);
  }, []);

  const handleProgress = useCallback((data: OnProgressData) => {
    setCurrentTime(data.currentTime);
  }, []);

  const handleBuffer = useCallback((data: OnBufferData) => {
    setBuffering(data.isBuffering);
  }, []);

  const handlePictureReady = useCallback(() => {
    setPictureReady(true);
  }, []);

  const handleError = useCallback(
    (data: OnVideoErrorData) => {
      const errorString = data.error?.errorString ?? "";
      // A track the user explicitly switched to can fail to decode on this
      // specific device (confirmed cause: codecs like Dolby Digital Plus
      // (E-AC3) have no hardware decoder on most Android devices, and
      // react-native-video ships no software fallback for licensed Dolby
      // codecs) even though the video played fine before that switch —
      // that's a device/codec limitation, not something fixable in JS.
      // Recover instead of dead-ending on the error screen: clear the
      // override entirely (selectedAudioTrackIndex !== null is exactly "we
      // had applied an explicit pick") so the reloaded player goes back to
      // native automatic selection — the same state that was already
      // proven working — and force a fresh player instance (ExoPlayer's
      // error state needs a new source, not just a prop change, to clear).
      if (
        /decoder_init_failed/i.test(errorString) &&
        selectedAudioTrackIndex !== null &&
        video
      ) {
        setSelectedAudioTrackIndex(null);
        savePosition(video.id, currentTimeRef.current, durationRef.current);
        setReloadToken((t) => t + 1);
        Alert.alert(
          "Can't use that audio track",
          "This audio track is not supported on this device. Playback switched back to the default one.",
        );
        return;
      }

      setErrorMessage(
        `Can't play "${video?.filename ?? "this video"}". ${errorString || "This format is not supported."}`,
      );
    },
    [video, savePosition, selectedAudioTrackIndex],
  );

  const seekTo = useCallback(
    (target: number) => {
      if (!videoRef.current) {
        return;
      }
      const clamped = Math.max(0, Math.min(duration || target, target));
      videoRef.current.seek(clamped);
      setCurrentTime(clamped);
    },
    [duration],
  );

  const seekBy = useCallback(
    (deltaSeconds: number) => {
      seekTo(currentTime + deltaSeconds);
    },
    [currentTime, seekTo],
  );

  const handleScrubStart = useCallback(() => {
    clearHideTimer();
  }, [clearHideTimer]);

  const handleScrubEnd = useCallback(() => {
    showControls();
  }, [showControls]);

  const handleToggleOrientation = useCallback(() => {
    setOrientationLock((prev) =>
      prev === ScreenOrientation.OrientationLock.LANDSCAPE
        ? ScreenOrientation.OrientationLock.PORTRAIT_UP
        : ScreenOrientation.OrientationLock.LANDSCAPE,
    );
  }, []);

  const handleTogglePlayPause = useCallback(() => {
    const wasPlaying = !usePlaybackStore.getState().paused;
    togglePlayPause();
    if (wasPlaying && video) {
      savePosition(video.id, currentTime, duration);
    }
    showControls();
  }, [
    togglePlayPause,
    video,
    currentTime,
    duration,
    savePosition,
    showControls,
  ]);

  // Same as handleTogglePlayPause but deliberately skips showControls() —
  // double-tapping the video to pause/resume (see GestureLayer) should stay
  // immersive, not pop the title bar/progress bar open.
  const handleDoubleTapTogglePlayPause = useCallback(() => {
    const wasPlaying = !usePlaybackStore.getState().paused;
    togglePlayPause();
    if (wasPlaying && video) {
      savePosition(video.id, currentTime, duration);
    }
  }, [togglePlayPause, video, currentTime, duration, savePosition]);

  const handleCycleZoomMode = useCallback(() => {
    setZoomMode(
      (prev) => ZOOM_CYCLE[(ZOOM_CYCLE.indexOf(prev) + 1) % ZOOM_CYCLE.length],
    );
    flashZoomMode();
  }, [flashZoomMode]);

  const handleSelectSubtitleFile = useCallback(async () => {
    if (!video) {
      return;
    }
    const result = await DocumentPicker.getDocumentAsync({
      type: "*/*",
      copyToCacheDirectory: true,
    });
    if (result.canceled || result.assets.length === 0) {
      return;
    }
    const picked = result.assets[0];
    if (!isSubtitleFilename(picked.name)) {
      Alert.alert("Not a subtitle file", "Please choose a .srt or .vtt file.");
      return;
    }
    try {
      // Copies the picked file into app storage under a name keyed by video
      // id, rather than keeping the picker's own uri — a document-picker
      // uri isn't guaranteed to still be readable on a later app launch.
      const ext = picked.name.toLowerCase().endsWith(".vtt") ? ".vtt" : ".srt";
      const dir = new Directory(Paths.document, "subtitles");
      if (!dir.exists) {
        dir.create({ intermediates: true, idempotent: true });
      }
      const destination = new File(dir, `${video.id}${ext}`);
      if (destination.exists) {
        destination.delete();
      }
      new File(picked.uri).copy(destination);
      usePlaybackStore
        .getState()
        .setSubtitleOverride(video.id, destination.uri);
      loadSubtitlesFor(video);
    } catch {
      Alert.alert(
        "Couldn't load subtitle",
        "The file could not be read. Please try again.",
      );
    }
  }, [video, loadSubtitlesFor]);

  const handleClearSubtitleOverride = useCallback(() => {
    if (!video) {
      return;
    }
    usePlaybackStore.getState().clearSubtitleOverride(video.id);
    loadSubtitlesFor(video);
  }, [video, loadSubtitlesFor]);

  const handleEnterPip = useCallback(() => {
    videoRef.current?.enterPictureInPicture?.();
  }, []);

  const handlePipStatusChanged = useCallback((isActive: boolean) => {
    setPipActive(isActive);
  }, []);

  const handleRestoreFromPip = useCallback(() => {
    setPipActive(false);
    // Tells Android the JS side has finished restoring its UI — without this
    // the app can be left in a stuck/blank state after leaving PiP.
    videoRef.current?.restoreUserInterfaceForPictureInPictureStopCompleted?.(
      true,
    );
  }, []);

  const handleBack = useCallback(() => {
    if (video) {
      savePosition(video.id, currentTime, duration);
    }
    router.back();
  }, [video, currentTime, duration, savePosition, router]);

  if (!video) {
    return (
      <View style={styles.center}>
        <StatusBar hidden={!controlsVisible} animated />
        <Text style={styles.errorText}>
          This video is no longer in the queue.
        </Text>
        <Pressable
          style={[styles.backButton, { backgroundColor: accentColor }]}
          onPress={() => router.back()}
        >
          <Text style={styles.controlText}>Back to library</Text>
        </Pressable>
      </View>
    );
  }

  const hasNext = adjacentVideoId(queue, video.id, 1) !== null;
  const hasPrevious = adjacentVideoId(queue, video.id, -1) !== null;

  // The lock button hides GestureLayer/ControlsOverlay entirely even if
  // controlsVisible itself hasn't been reset, so the controls bar being
  // genuinely on screen requires checking both.
  const controlsBarVisible = controlsVisible && !locked;
  const subtitleBottomOffset = controlsBarVisible
    ? insets.bottom + bottomControlsTouchHeight + SUBTITLE_CONTROLS_GAP
    : insets.bottom + SUBTITLE_BASE_GAP;

  // For the menu's checkmark: an explicit pick if we've made one, otherwise
  // whichever track the native player reports as its own current default —
  // reflects reality either way, since audioTracks is kept live via
  // onAudioTracks, not just assumed from our own last request.
  const displayedAudioTrackIndex =
    selectedAudioTrackIndex ??
    audioTracks.find((track) => track.selected)?.index ??
    null;

  // Frozen at the resumed start position until the picture itself is ready
  // to show — see pictureReady above. Only feeds UI display (seek bar,
  // timer text, subtitles, gesture-layer seek preview); seeking/saving keep
  // reading the real, immediately-updating currentTime state.
  const displayTime = pictureReady ? currentTime : resolveResumeSeconds(video);

  return (
    <View style={styles.container}>
      <StatusBar hidden={systemBarsHidden} animated />
      {errorMessage ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Pressable
            style={[styles.backButton, { backgroundColor: accentColor }]}
            onPress={handleBack}
          >
            <Text style={styles.controlText}>Back to library</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <VideoPlayer
            key={`${video.id}-${reloadToken}`}
            ref={videoRef}
            uri={video.uri}
            paused={paused}
            muted={volumeMuted}
            startPositionSeconds={resolveResumeSeconds(video)}
            rate={rate}
            loop={loop}
            zoomMode={zoomMode}
            zoomProgress={zoomProgress}
            // Already known from the library scan — lets VideoPlayer size
            // its "contain" letterbox box correctly from the very first
            // render instead of waiting on the player's own onLoad (see
            // VideoPlayer's top-of-file note on why that gap matters). 0
            // means genuinely unknown (an older library entry scanned
            // before width/height capture existed), not a real dimension.
            initialNaturalSize={
              video.width && video.height
                ? { width: video.width, height: video.height }
                : null
            }
            // Only on the true first mount for this video — a reloadToken
            // bump (audio-track switch, error recovery) is a brief reinit
            // mid-playback, where flashing a static thumbnail would read as
            // a stutter rather than smoothing anything out.
            posterUri={reloadToken === 0 ? video.thumbnailUri : null}
            selectedAudioTrackIndex={selectedAudioTrackIndex}
            // Picture-in-Picture must stay an explicit choice (the PiP
            // button, via handleEnterPip) — never triggered just by
            // backgrounding the app. See the AppState listener below for
            // the corresponding "pause unless PiP was manually entered"
            // behavior.
            enterPictureInPictureOnLeave={false}
            onLoad={handleLoad}
            onProgress={handleProgress}
            onBuffer={handleBuffer}
            onEnd={handleEnd}
            onError={handleError}
            onAudioTracks={handleAudioTracksChanged}
            onPictureReady={handlePictureReady}
            onPictureInPictureStatusChanged={handlePipStatusChanged}
            onRestoreUserInterfaceForPictureInPictureStop={handleRestoreFromPip}
          />

          {pipActive ? null : (
            <ZoomModeHUD
              opacity={zoomFlashOpacity}
              label={ZOOM_MODE_LABELS[zoomMode]}
            />
          )}

          {pipActive ? null : (
            <SubtitleOverlay
              cues={subtitleCues}
              currentTime={displayTime}
              visible={subtitlesEnabled}
              bottomOffset={subtitleBottomOffset}
            />
          )}

          {pipActive ? null : locked ? (
            <Pressable
              style={styles.unlockButton}
              onPress={() => setLocked(false)}
              hitSlop={16}
            >
              <Ionicons name="lock-closed-outline" size={22} color="#fff" />
            </Pressable>
          ) : (
            <>
              <GestureLayer
                currentTime={displayTime}
                duration={duration}
                volumeLevel={volumeLevel}
                paused={paused}
                onTogglePlayPause={handleDoubleTapTogglePlayPause}
                onSeekTo={(time) => {
                  seekTo(time);
                  showControls();
                }}
                onToggleControls={toggleControls}
                onShowControls={showControls}
                zoomProgress={zoomProgress}
                onZoomSnap={handleZoomSnap}
                bottomInset={controlsVisible ? bottomControlsTouchHeight : 0}
              />

              <ControlsOverlay
                visible={controlsVisible}
                title={video.filename}
                paused={paused}
                currentTime={displayTime}
                duration={duration}
                buffering={buffering}
                hasNext={hasNext}
                hasPrevious={hasPrevious}
                isLandscape={isLandscape}
                videoUri={video.uri}
                videoId={video.id}
                rate={rate}
                onRateChange={setRate}
                loop={loop}
                onToggleLoop={() => setLoop((v) => !v)}
                onCycleZoomMode={handleCycleZoomMode}
                hasSubtitle={subtitleCues.length > 0}
                subtitlesEnabled={subtitlesEnabled}
                onToggleSubtitles={() => setSubtitlesEnabled((v) => !v)}
                hasManualSubtitleOverride={hasManualSubtitleOverride}
                onSelectSubtitleFile={handleSelectSubtitleFile}
                onClearSubtitleOverride={handleClearSubtitleOverride}
                audioTracks={audioTracks}
                selectedAudioTrackIndex={displayedAudioTrackIndex}
                onSelectAudioTrack={handleSelectAudioTrack}
                volumeLevel={volumeLevel}
                onSetVolume={setVolume}
                onBack={handleBack}
                onLock={() => setLocked(true)}
                onTogglePlayPause={handleTogglePlayPause}
                onSeekBy={(delta) => {
                  seekBy(delta);
                  showControls();
                }}
                onNext={() => {
                  goToVideo(adjacentVideoId(queue, video.id, 1));
                  showControls();
                }}
                onPrevious={() => {
                  goToVideo(adjacentVideoId(queue, video.id, -1));
                  showControls();
                }}
                onSeek={(time) => {
                  seekTo(time);
                  showControls();
                }}
                onScrubStart={handleScrubStart}
                onScrubEnd={handleScrubEnd}
                onToggleOrientation={handleToggleOrientation}
                pipSupported={PIP_SUPPORTED}
                onEnterPip={handleEnterPip}
              />
            </>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
    backgroundColor: "#000",
  },
  errorText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 15,
  },
  backButton: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  controlText: {
    color: "#fff",
    fontWeight: "600",
  },
  unlockButton: {
    position: "absolute",
    bottom: 24,
    left: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
});
