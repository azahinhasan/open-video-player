import { Ionicons } from '@expo/vector-icons';
import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { runOnJS, useAnimatedReaction, type SharedValue } from 'react-native-reanimated';

const DEFAULT_RESTORE_VOLUME = 0.5;

type MuteButtonProps = {
  volumeLevel: SharedValue<number>;
  onSetVolume: (value: number) => void;
  size?: number;
  color?: string;
};

export function MuteButton({ volumeLevel, onSetVolume, size = 20, color = '#fff' }: MuteButtonProps) {
  const [muted, setMuted] = useState(() => volumeLevel.value <= 0);
  const lastVolumeRef = useRef(volumeLevel.value > 0 ? volumeLevel.value : DEFAULT_RESTORE_VOLUME);

  const handleVolumeChange = useCallback((value: number) => {
    setMuted(value <= 0);
    if (value > 0) {
      lastVolumeRef.current = value;
    }
  }, []);

  // Purely reactive to the shared volumeLevel — onSetVolume writes to it
  // synchronously, so this updates instantly regardless of whether the
  // native "volume changed" event echoes back (it doesn't, for changes the
  // app itself triggers).
  useAnimatedReaction(
    () => volumeLevel.value,
    (value, previous) => {
      if (value !== previous) {
        runOnJS(handleVolumeChange)(value);
      }
    },
    []
  );

  const toggleMute = () => {
    onSetVolume(muted ? lastVolumeRef.current : 0);
  };

  return (
    <Pressable style={styles.button} onPress={toggleMute} hitSlop={12}>
      <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={size} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 4,
  },
});
