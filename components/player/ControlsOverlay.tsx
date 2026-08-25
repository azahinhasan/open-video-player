import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChapterRail } from '@/components/player/ChapterRail';
import { MoreOptionsMenu } from '@/components/player/MoreOptionsMenu';
import { MuteButton } from '@/components/player/MuteButton';
import { usePlaybackPreferences } from '@/hooks/usePlaybackPreferences';
import { useAccentColor } from '@/hooks/useThemePreference';
import { formatTime } from '@/utils/formatTime';

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
  onCycleZoomMode: () => void;
  hasSubtitle: boolean;
  subtitlesEnabled: boolean;
  onToggleSubtitles: () => void;
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
  onCycleZoomMode,
  hasSubtitle,
  subtitlesEnabled,
  onToggleSubtitles,
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
      <Pressable style={styles.iconButton} onPress={onPrevious} disabled={!hasPrevious} hitSlop={12}>
        <Ionicons name="play-skip-back" size={26} color={hasPrevious ? '#fff' : '#555'} />
      </Pressable>
      <Pressable style={styles.iconButton} onPress={() => onSeekBy(-10)} hitSlop={12}>
        <Ionicons name="play-back" size={26} color="#fff" />
      </Pressable>
      <Pressable
        style={[styles.playButton, { backgroundColor: accentColor }]}
        onPress={onTogglePlayPause}
        hitSlop={12}>
        <Ionicons name={paused ? 'play' : 'pause'} size={30} color="#fff" />
      </Pressable>
      <Pressable style={styles.iconButton} onPress={() => onSeekBy(10)} hitSlop={12}>
        <Ionicons name="play-forward" size={26} color="#fff" />
      </Pressable>
      <Pressable style={styles.iconButton} onPress={onNext} disabled={!hasNext} hitSlop={12}>
        <Ionicons name="play-skip-forward" size={26} color={hasNext ? '#fff' : '#555'} />
      </Pressable>
    </>
  );

  return (
    <Animated.View
      style={[styles.fill, containerStyle]}
      pointerEvents={visible ? 'box-none' : 'none'}>
      <Animated.View
        style={[
          styles.topBar,
          topBarStyle,
          { paddingTop: insets.top + 6, paddingLeft: insets.left + 12, paddingRight: insets.right + 12 },
        ]}
        pointerEvents="box-none">
        <Pressable style={styles.iconButton} onPress={onBack} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <MuteButton volumeLevel={volumeLevel} onSetVolume={onSetVolume} size={20} color="#fff" />
        <Pressable
          style={styles.iconButton}
          onPress={() => (menuOpen ? closeMenu() : openMenu())}
          hitSlop={12}>
          <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
        </Pressable>
      </Animated.View>

      {controlsLayout === 'center' ? (
        <View style={styles.centerRow} pointerEvents="box-none">
          {transportControls}
        </View>
      ) : null}

      <Animated.View
        style={[
          styles.bottomBar,
          bottomBarStyle,
          { paddingBottom: insets.bottom + 14, paddingLeft: insets.left, paddingRight: insets.right },
        ]}
        pointerEvents="box-none">
        <ChapterRail
          videoUri={videoUri}
          videoId={videoId}
          duration={duration}
          currentTime={currentTime}
          buffering={buffering}
          onSeek={onSeek}
          onScrubStart={onScrubStart}
          onScrubEnd={onScrubEnd}
        />
        {controlsLayout === 'bottom' ? (
          <View style={styles.bottomTransportRow} pointerEvents="box-none">
            {transportControls}
          </View>
        ) : null}
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </Text>
          <View style={styles.timeSpacer} />
          <Pressable style={styles.orientationButton} onPress={onCycleZoomMode} hitSlop={12}>
            <Ionicons name="scan-outline" size={20} color="#fff" />
          </Pressable>
          <Pressable style={styles.orientationButton} onPress={onToggleOrientation} hitSlop={12}>
            <MaterialCommunityIcons
              name={isLandscape ? 'phone-rotate-portrait' : 'phone-rotate-landscape'}
              size={20}
              color="#fff"
            />
          </Pressable>
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
        onLock={onLock}
        topOffset={insets.top + 48}
        rightOffset={insets.right + 12}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  title: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  centerRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    marginTop: -34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingBottom: 14,
    paddingTop: 14,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 6,
  },
  timeText: {
    color: '#fff',
    fontSize: 12,
  },
  timeSpacer: {
    flex: 1,
  },
  orientationButton: {
    padding: 4,
  },
});
