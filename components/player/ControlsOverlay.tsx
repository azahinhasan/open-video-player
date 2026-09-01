import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AudioTrack } from "react-native-video";

import { MoreOptionsMenu } from "@/components/player/MoreOptionsMenu";
import { MuteButton } from "@/components/player/MuteButton";
import { SeekBar } from "@/components/player/SeekBar";
import type { VideoZoomMode } from "@/components/player/VideoPlayer";
import { usePlaybackPreferences } from "@/hooks/usePlaybackPreferences";
import { useAccentColor } from "@/hooks/useThemePreference";
import { formatTime } from "@/utils/formatTime";

// One icon per zoom mode, shown on the cycle button in place of the mode it
// will switch TO if pressed again — so the button always reflects the mode
// currently active, not a generic static glyph.
const ZOOM_MODE_ICONS: Record<
  VideoZoomMode,
  keyof typeof Ionicons.glyphMap
> = {
  contain: "contract-outline",
  cover: "expand-outline",
  stretch: "resize-outline",
};

type ControlsOverlayProps = {
  visible: boolean;
  title: string;
  paused: boolean;
  currentTime: number;
  duration: number;
  buffering: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
  isLandscape: boolean;
  videoUri: string;
  videoId: string;
  rate: number;
  onRateChange: (rate: number) => void;
  loop: boolean;
  onToggleLoop: () => void;
  zoomMode: VideoZoomMode;
  onCycleZoomMode: () => void;
  hasSubtitle: boolean;
  subtitlesEnabled: boolean;
  onToggleSubtitles: () => void;
  hasManualSubtitleOverride: boolean;
  onSelectSubtitleFile: () => void;
  onClearSubtitleOverride: () => void;
  audioTracks: AudioTrack[];
  selectedAudioTrackIndex: number | null;
  onSelectAudioTrack: (index: number) => void;
  volumeLevel: SharedValue<number>;
  onSetVolume: (value: number) => void;
  onBack: () => void;
  onLock: () => void;
  onTogglePlayPause: () => void;
  onSeekBy: (deltaSeconds: number) => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (time: number) => void;
  onScrubStart: () => void;
  onScrubEnd: () => void;
  onToggleOrientation: () => void;
  pipSupported: boolean;
  onEnterPip: () => void;
};

export function ControlsOverlay({
  visible,
  title,
  paused,
  currentTime,
  duration,
  buffering,
  hasNext,
  hasPrevious,
  isLandscape,
  videoUri,
  videoId,
  rate,
  onRateChange,
  loop,
  onToggleLoop,
  zoomMode,
  onCycleZoomMode,
  hasSubtitle,
  subtitlesEnabled,
  onToggleSubtitles,
  hasManualSubtitleOverride,
  onSelectSubtitleFile,
  onClearSubtitleOverride,
  audioTracks,
  selectedAudioTrackIndex,
  onSelectAudioTrack,
  volumeLevel,
  onSetVolume,
  onBack,
  onLock,
  onTogglePlayPause,
  onSeekBy,
  onNext,
  onPrevious,
  onSeek,
  onScrubStart,
  onScrubEnd,
  onToggleOrientation,
  pipSupported,
  onEnterPip,
}: ControlsOverlayProps) {
  const progress = useSharedValue(visible ? 1 : 0);
  const [menuOpen, setMenuOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const accentColor = useAccentColor();
  const controlsLayout = usePlaybackPreferences((s) => s.controlsLayout);

  const openMenu = () => {
    setMenuOpen(true);
    onScrubStart();
  };

  const closeMenu = () => {
    setMenuOpen(false);
    onScrubEnd();
  };

  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, { duration: 220 });
  }, [visible, progress]);

  useEffect(() => {
    if (!visible) {
      setMenuOpen(false);
    }
  }, [visible]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const topBarStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * -12 }],
  }));

  const bottomBarStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 12 }],
  }));

  const transportControls = (
    <>
      <Pressable
        style={styles.iconButton}
        onPress={onPrevious}
        disabled={!hasPrevious}
        hitSlop={12}
      >
        <Ionicons
          name="play-skip-back"
          size={26}
          color={hasPrevious ? "#fff" : "#555"}
        />
      </Pressable>
      <Pressable
        style={styles.iconButton}
        onPress={() => onSeekBy(-10)}
        hitSlop={12}
      >
        <Ionicons name="play-back" size={26} color="#fff" />
      </Pressable>
      <Pressable
        style={[styles.playButton, { backgroundColor: accentColor }]}
        onPress={onTogglePlayPause}
        hitSlop={12}
      >
        <Ionicons name={paused ? "play" : "pause"} size={30} color="#fff" />
      </Pressable>
      <Pressable
        style={styles.iconButton}
        onPress={() => onSeekBy(10)}
        hitSlop={12}
      >
        <Ionicons name="play-forward" size={26} color="#fff" />
      </Pressable>
      <Pressable
        style={styles.iconButton}
        onPress={onNext}
        disabled={!hasNext}
        hitSlop={12}
      >
        <Ionicons
          name="play-skip-forward"
          size={26}
          color={hasNext ? "#fff" : "#555"}
        />
      </Pressable>
    </>
  );

  return (
    <Animated.View
      style={[styles.fill, containerStyle]}
      pointerEvents={visible ? "box-none" : "none"}
    >
      <Animated.View
        style={[
          styles.topBar,
          topBarStyle,
          // Same reasoning as bottomBar's paddingHorizontal below: symmetric
          // padding keeps the back button/title/menu row centered as a
          // group even when insets.left and insets.right differ (a
          // landscape-side notch/cutout), rather than shifting it toward
          // whichever side has less inset.
          //
          // paddingTop: landscape has much less vertical room than portrait
          // (same reasoning as bottomBar's paddingBottom above), so the
          // extra +6 cosmetic buffer is dropped there — but insets.top
          // itself is always added in full, never capped/reduced. A
          // previous version of this used Math.min(insets.top, N), which
          // could cap the total BELOW the real status bar height and
          // render the back/title/menu row partly underneath it — where
          // the system status bar itself intercepts touches before they
          // reach the app, making the three-dot menu (and back button)
          // untappable. insets.top must always be respected in full.
          {
            paddingTop: isLandscape ? Math.min(insets.top, 20) : insets.top + 2,
            paddingHorizontal: Math.max(insets.left, insets.right) + 12,
          },
        ]}
        pointerEvents="box-none"
      >
        <Pressable style={styles.iconButton} onPress={onBack} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Pressable
          style={styles.iconButton}
          onPress={() => (menuOpen ? closeMenu() : openMenu())}
          hitSlop={12}
        >
          <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
        </Pressable>
      </Animated.View>

      {controlsLayout === "center" ? (
        <View style={styles.centerRow} pointerEvents="box-none">
          {transportControls}
        </View>
      ) : null}

      <Animated.View
        style={[
          styles.bottomBar,
          bottomBarStyle,
          {
            // Landscape has much less vertical room than portrait, so the
            // extra +14 cosmetic buffer is reduced to +4 there — but
            // insets.bottom itself is always added in full, never
            // capped/reduced (see topBar's paddingTop above for why: an
            // earlier Math.min(insets.bottom, N)-based version of this
            // could cap the total BELOW the real nav bar height, rendering
            // the seek bar/transport buttons partly underneath it, where
            // the system nav bar intercepts touches before they reach the
            // app).
            paddingBottom: insets.bottom + (isLandscape ? 4 : 14),
            // Symmetric, not insets.left/insets.right individually — on a
            // device with a landscape-side notch/cutout, those two differ,
            // and padding each side by its own inset shifts the seek bar/
            // buttons/time row off-center (toward whichever side has less)
            // instead of just leaving the notch itself uncovered. Using the
            // larger of the two on both sides keeps content centered while
            // still never rendering under the cutout.
            paddingHorizontal: Math.max(insets.left, insets.right),
          },
        ]}
        pointerEvents="box-none"
      >
        <SeekBar
          videoUri={videoUri}
          videoId={videoId}
          duration={duration}
          currentTime={currentTime}
          buffering={buffering}
          onSeek={onSeek}
          onScrubStart={onScrubStart}
          onScrubEnd={onScrubEnd}
        />
        {controlsLayout === "bottom" ? (
          <View style={styles.bottomTransportRow} pointerEvents="box-none">
            {transportControls}
          </View>
        ) : null}
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </Text>
          <View style={styles.timeSpacer} />
          <Pressable
            style={styles.orientationButton}
            onPress={onCycleZoomMode}
            hitSlop={12}
          >
            <Ionicons name={ZOOM_MODE_ICONS[zoomMode]} size={20} color="#fff" />
          </Pressable>
          <Pressable
            style={styles.orientationButton}
            onPress={onToggleOrientation}
            hitSlop={12}
          >
            <MaterialCommunityIcons
              name={
                isLandscape ? "phone-rotate-portrait" : "phone-rotate-landscape"
              }
              size={20}
              color="#fff"
            />
          </Pressable>
          <MuteButton
            volumeLevel={volumeLevel}
            onSetVolume={onSetVolume}
            size={20}
            color="#fff"
          />
        </View>
      </Animated.View>

      <MoreOptionsMenu
        visible={menuOpen}
        onClose={closeMenu}
        rate={rate}
        onRateChange={onRateChange}
        loop={loop}
        onToggleLoop={onToggleLoop}
        hasSubtitle={hasSubtitle}
        subtitlesEnabled={subtitlesEnabled}
        onToggleSubtitles={onToggleSubtitles}
        hasManualSubtitleOverride={hasManualSubtitleOverride}
        onSelectSubtitleFile={onSelectSubtitleFile}
        onClearSubtitleOverride={onClearSubtitleOverride}
        audioTracks={audioTracks}
        selectedAudioTrackIndex={selectedAudioTrackIndex}
        onSelectAudioTrack={onSelectAudioTrack}
        onLock={onLock}
        pipSupported={pipSupported}
        onEnterPip={onEnterPip}
        topOffset={insets.top + 48}
        rightOffset={insets.right + 12}
        bottomOffset={insets.bottom + 12}
        leftOffset={insets.left + 12}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
  },
  topBar: {
    position: "absolute",
    top: 9,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 3,
    backgroundColor: "rgba(0, 0, 0, 0.07)",
  },
  title: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  centerRow: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "50%",
    marginTop: -34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  iconButton: {
    padding: 8,
  },
  playButton: {
    padding: 14,
    marginHorizontal: 10,
    borderRadius: 999,
  },
  bottomTransportRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    marginBottom: 0,
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 6,
    backgroundColor: "rgba(0, 0, 0, 0.07)",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 0,
  },
  timeText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "500",
  },
  timeSpacer: {
    flex: 1,
  },
  orientationButton: {
    padding: 4,
  },
});
