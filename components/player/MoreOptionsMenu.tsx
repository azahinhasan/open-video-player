import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { AudioTrack } from 'react-native-video';

import { useAccentColor } from '@/hooks/useThemePreference';
import { audioTrackLabel } from '@/utils/audioTracks';

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

type MoreOptionsMenuProps = {
  visible: boolean;
  onClose: () => void;
  rate: number;
  onRateChange: (rate: number) => void;
  loop: boolean;
  onToggleLoop: () => void;
  hasSubtitle: boolean;
  subtitlesEnabled: boolean;
  onToggleSubtitles: () => void;
  hasManualSubtitleOverride: boolean;
  onSelectSubtitleFile: () => void;
  onClearSubtitleOverride: () => void;
  audioTracks: AudioTrack[];
  selectedAudioTrackIndex: number | null;
  onSelectAudioTrack: (index: number) => void;
  onLock: () => void;
  pipSupported: boolean;
  onEnterPip: () => void;
  topOffset: number;
  rightOffset: number;
  bottomOffset: number;
  leftOffset: number;
};

export function MoreOptionsMenu({
  visible,
  onClose,
  rate,
  onRateChange,
  loop,
  onToggleLoop,
  hasSubtitle,
  subtitlesEnabled,
  onToggleSubtitles,
  hasManualSubtitleOverride,
  onSelectSubtitleFile,
  onClearSubtitleOverride,
  audioTracks,
  selectedAudioTrackIndex,
  onSelectAudioTrack,
  onLock,
  pipSupported,
  onEnterPip,
  topOffset,
  rightOffset,
  bottomOffset,
  leftOffset,
}: MoreOptionsMenuProps) {
  const accentColor = useAccentColor();
  const { height: windowHeight } = useWindowDimensions();

  if (!visible) {
    return null;
  }

  // No `bottom` here deliberately — setting both top and bottom stretches
  // the panel to fill that whole span regardless of content (that was the
  // "always full height" bug). Height now follows content, capped by
  // maxHeight so a long list still can't run off-screen — the ScrollView
  // below takes over once content actually exceeds that.
  const maxHeight = Math.max(0, windowHeight - topOffset - bottomOffset);

  return (
    <>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.panel, { top: topOffset, right: rightOffset, left: leftOffset, maxHeight }]}>
      <ScrollView contentContainerStyle={styles.panelContent} showsVerticalScrollIndicator>
        <Text style={styles.sectionLabel}>Speed</Text>
        <View style={styles.speedRow}>
          {SPEED_OPTIONS.map((option) => (
            <Pressable
              key={option}
              style={[
                styles.speedChip,
                option === rate ? { backgroundColor: accentColor } : null,
              ]}
              onPress={() => onRateChange(option)}>
              <Text style={[styles.speedChipText, option === rate ? styles.speedChipTextActive : null]}>
                {option}x
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.row} onPress={onToggleLoop}>
          <Ionicons name="repeat" size={18} color="#fff" />
          <Text style={styles.rowText}>Loop</Text>
          <View style={styles.rowSpacer} />
          <Ionicons name={loop ? 'checkbox' : 'square-outline'} size={18} color="#fff" />
        </Pressable>

        {hasSubtitle ? (
          <Pressable style={styles.row} onPress={onToggleSubtitles}>
            <Ionicons name="chatbox-outline" size={18} color="#fff" />
            <Text style={styles.rowText}>Subtitles</Text>
            <View style={styles.rowSpacer} />
            <Ionicons name={subtitlesEnabled ? 'checkbox' : 'square-outline'} size={18} color="#fff" />
          </Pressable>
        ) : null}

        <Pressable
          style={styles.row}
          onPress={() => {
            onClose();
            onSelectSubtitleFile();
          }}>
          <Ionicons name="document-attach-outline" size={18} color="#fff" />
          <Text style={styles.rowText}>Select subtitle file</Text>
        </Pressable>

        {hasManualSubtitleOverride ? (
          <Pressable
            style={styles.row}
            onPress={() => {
              onClose();
              onClearSubtitleOverride();
            }}>
            <Ionicons name="close-circle-outline" size={18} color="#fff" />
            <Text style={styles.rowText}>Remove subtitle</Text>
          </Pressable>
        ) : null}

        {audioTracks.length > 1 ? (
          <>
            <View style={styles.divider} />
            <Text style={styles.sectionLabel}>Audio</Text>
            {audioTracks.map((track) => (
              <Pressable
                key={track.index}
                style={styles.row}
                onPress={() => {
                  onClose();
                  onSelectAudioTrack(track.index);
                }}>
                <Ionicons
                  name={track.index === selectedAudioTrackIndex ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color={track.index === selectedAudioTrackIndex ? accentColor : '#fff'}
                />
                <Text style={styles.rowText}>{audioTrackLabel(track, track.index)}</Text>
              </Pressable>
            ))}
          </>
        ) : null}

        <View style={styles.divider} />

        {pipSupported ? (
          <Pressable
            style={styles.row}
            onPress={() => {
              onClose();
              onEnterPip();
            }}>
            <MaterialCommunityIcons name="picture-in-picture-bottom-right-outline" size={18} color="#fff" />
            <Text style={styles.rowText}>Picture-in-Picture</Text>
          </Pressable>
        ) : null}

        <Pressable
          style={styles.row}
          onPress={() => {
            onClose();
            onLock();
          }}>
          <Ionicons name="lock-closed-outline" size={18} color="#fff" />
          <Text style={styles.rowText}>Lock screen</Text>
        </Pressable>
      </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  panel: {
    position: 'absolute',
    backgroundColor: 'rgba(20,20,20,0.95)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  panelContent: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 4,
  },
  sectionLabel: {
    color: '#aaa',
    fontSize: 11,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  speedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  speedChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  speedChipText: {
    color: '#fff',
    fontSize: 12,
  },
  speedChipTextActive: {
    fontWeight: '700',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  rowText: {
    color: '#fff',
    fontSize: 13,
  },
  rowSpacer: {
    flex: 1,
  },
});
