import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import type {
  OnBufferData,
  OnLoadData,
  OnProgressData,
  OnVideoErrorData,
  VideoRef,
} from 'react-native-video';
import { VolumeManager } from 'react-native-volume-manager';

import { ControlsOverlay } from '@/components/player/ControlsOverlay';
import { GestureLayer } from '@/components/player/GestureLayer';
import { VideoPlayer, type VideoZoomMode } from '@/components/player/VideoPlayer';
import { useImmersiveMode } from '@/hooks/useImmersiveMode';
import { useOrientationLock } from '@/hooks/useOrientationLock';
import { usePlaybackPreferences } from '@/hooks/usePlaybackPreferences';
import { adjacentVideoId, usePlaybackStore } from '@/hooks/usePlaybackStore';
import { useAccentColor } from '@/hooks/useThemePreference';
import type { VideoAsset } from '@/types/video';

const AUTO_HIDE_DELAY_MS = 3000;
const ZOOM_CYCLE: VideoZoomMode[] = ['contain', 'cover', 'stretch'];
// Generously covers the Chapter Rail's touch area plus the time row beneath
// it, so GestureLayer's full-screen zones don't compete with the rail's own
// gesture for taps while the bottom bar is actually on screen. When the
// transport buttons also live down there (controlsLayout: 'bottom'), the
// zone needs to grow to cover that extra row too, for the same reason.
const BOTTOM_CONTROLS_TOUCH_HEIGHT_CENTER = 110;
const BOTTOM_CONTROLS_TOUCH_HEIGHT_WITH_TRANSPORT = 190;

export default function PlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queue = usePlaybackStore((s) => s.queue);
  const paused = usePlaybackStore((s) => s.paused);
  const play = usePlaybackStore((s) => s.play);
  const togglePlayPause = usePlaybackStore((s) => s.togglePlayPause);
  const savePosition = usePlaybackStore((s) => s.savePosition);
  const positionFor = usePlaybackStore((s) => s.positionFor);

  const video = queue.find((v) => v.id === id) ?? null;
  const videoRef = useRef<VideoRef>(null);
  const accentColor = useAccentColor();
  const resumeBehavior = usePlaybackPreferences((s) => s.resumeBehavior);
  const controlsLayout = usePlaybackPreferences((s) => s.controlsLayout);
  const bottomControlsTouchHeight =
    controlsLayout === 'bottom' ? BOTTOM_CONTROLS_TOUCH_HEIGHT_WITH_TRANSPORT : BOTTOM_CONTROLS_TOUCH_HEIGHT_CENTER;

  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [buffering, setBuffering] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [orientationLock, setOrientationLock] = useState(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  const [locked, setLocked] = useState(false);
  const [rate, setRate] = useState(1);
  const [loop, setLoop] = useState(false);
  const [zoomMode, setZoomMode] = useState<VideoZoomMode>('contain');
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Single source of truth for media volume, shared between GestureLayer's
  // swipe gesture and the mute button — both read/write this same value so
  // muting always reflects immediately everywhere, instead of each side
  // caching its own copy and waiting on a native "volume changed" event that
  // never actually echoes back for changes the app itself triggered.
  const volumeLevel = useSharedValue(0.5);

  useEffect(() => {
    VolumeManager.getVolume()
      .then((result) => {
        volumeLevel.value = result.volume;
      })
      .catch(() => {});
    // The native event also fires for non-media streams (ring, notification,
    // alarm, system, call) — ignore anything that isn't the music stream, or
    // it'll get treated as if playback volume itself changed.
    const subscription = VolumeManager.addVolumeListener((result) => {
      if (result.type && result.type !== 'music') {
        return;
      }
      volumeLevel.value = result.volume;
    });
    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setVolume = useCallback(
    (value: number) => {
      const clamped = Math.min(1, Math.max(0, value));
      volumeLevel.value = clamped;
      VolumeManager.setVolume(clamped, { showUI: false, playSound: false }).catch(() => {});
    },
    [volumeLevel]
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
      savePosition(currentVideo.id, currentTimeRef.current, durationRef.current);
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
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        persistCurrentPosition();
      }
    });
    return () => subscription.remove();
  }, [persistCurrentPosition]);

  useKeepAwake();
  useOrientationLock(orientationLock);
  useImmersiveMode(!controlsVisible);

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
    hideTimerRef.current = setTimeout(() => setControlsVisible(false), AUTO_HIDE_DELAY_MS);
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

  useEffect(() => {
    setDuration(0);
    setCurrentTime(0);
    setBuffering(false);
    setErrorMessage(null);
    setLocked(false);
    setRate(1);
    setLoop(false);
    setZoomMode('contain');
    setSubtitlesEnabled(true);

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
      router.replace(`/player/${targetId}`);
    },
    [video, currentTime, duration, savePosition, router]
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
      router.replace(`/player/${nextId}`);
    }
  }, [video, queue, duration, savePosition, router, showControls]);

  const handleLoad = useCallback((data: OnLoadData) => {
    setDuration(data.duration);
  }, []);

  const handleProgress = useCallback((data: OnProgressData) => {
    setCurrentTime(data.currentTime);
  }, []);

  const handleBuffer = useCallback((data: OnBufferData) => {
    setBuffering(data.isBuffering);
  }, []);

  const handleError = useCallback(
    (data: OnVideoErrorData) => {
      setErrorMessage(
        `Can't play "${video?.filename ?? 'this video'}". ${
          data.error?.errorString ?? 'This format is not supported.'
        }`
      );
    },
    [video]
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
    [duration]
  );

  const seekBy = useCallback(
    (deltaSeconds: number) => {
      seekTo(currentTime + deltaSeconds);
    },
    [currentTime, seekTo]
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
        : ScreenOrientation.OrientationLock.LANDSCAPE
    );
  }, []);

  const handleTogglePlayPause = useCallback(() => {
    const wasPlaying = !usePlaybackStore.getState().paused;
    togglePlayPause();
    if (wasPlaying && video) {
      savePosition(video.id, currentTime, duration);
    }
    showControls();
  }, [togglePlayPause, video, currentTime, duration, savePosition, showControls]);

  const handleCycleZoomMode = useCallback(() => {
    setZoomMode((prev) => ZOOM_CYCLE[(ZOOM_CYCLE.indexOf(prev) + 1) % ZOOM_CYCLE.length]);
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
        <Text style={styles.errorText}>This video is no longer in the queue.</Text>
        <Pressable
          style={[styles.backButton, { backgroundColor: accentColor }]}
          onPress={() => router.back()}>
          <Text style={styles.controlText}>Back to library</Text>
        </Pressable>
      </View>
    );
  }

  const hasNext = adjacentVideoId(queue, video.id, 1) !== null;
  const hasPrevious = adjacentVideoId(queue, video.id, -1) !== null;

  return (
    <View style={styles.container}>
      <StatusBar hidden={!controlsVisible} animated />
      {errorMessage ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Pressable style={[styles.backButton, { backgroundColor: accentColor }]} onPress={handleBack}>
            <Text style={styles.controlText}>Back to library</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <VideoPlayer
            key={video.id}
            ref={videoRef}
            uri={video.uri}
            paused={paused}
            startPositionSeconds={resumeBehavior === 'restart' ? 0 : positionFor(video.id)}
            rate={rate}
            loop={loop}
            zoomMode={zoomMode}
            subtitleUri={video.subtitleUri}
            subtitlesEnabled={subtitlesEnabled}
            onLoad={handleLoad}
            onProgress={handleProgress}
            onBuffer={handleBuffer}
            onEnd={handleEnd}
            onError={handleError}
          />

          {locked ? (
            <Pressable style={styles.unlockButton} onPress={() => setLocked(false)} hitSlop={16}>
              <Ionicons name="lock-closed-outline" size={22} color="#fff" />
            </Pressable>
          ) : (
            <>
              <GestureLayer
                currentTime={currentTime}
                duration={duration}
                volumeLevel={volumeLevel}
                onSeekBy={(delta) => {
                  seekBy(delta);
                  showControls();
                }}
                onSeekTo={(time) => {
                  seekTo(time);
                  showControls();
                }}
                onToggleControls={toggleControls}
                bottomInset={controlsVisible ? bottomControlsTouchHeight : 0}
              />

              <ControlsOverlay
                visible={controlsVisible}
                title={video.filename}
                paused={paused}
                currentTime={currentTime}
                duration={duration}
                buffering={buffering}
                hasNext={hasNext}
                hasPrevious={hasPrevious}
                isLandscape={orientationLock === ScreenOrientation.OrientationLock.LANDSCAPE}
                videoUri={video.uri}
                videoId={video.id}
                rate={rate}
                onRateChange={setRate}
                loop={loop}
                onToggleLoop={() => setLoop((v) => !v)}
                onCycleZoomMode={handleCycleZoomMode}
                hasSubtitle={video.subtitleUri !== null}
                subtitlesEnabled={subtitlesEnabled}
                onToggleSubtitles={() => setSubtitlesEnabled((v) => !v)}
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
    backgroundColor: '#000',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
    backgroundColor: '#000',
  },
  errorText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 15,
  },
  backButton: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  controlText: {
    color: '#fff',
    fontWeight: '600',
  },
  unlockButton: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
