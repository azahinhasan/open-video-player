import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAccentColor } from '@/hooks/useThemePreference';

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
  onLock: () => void;
  pipSupported: boolean;
  onEnterPip: () => void;
  topOffset: number;
  rightOffset: number;
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
  onLock,
  pipSupported,
  onEnterPip,
  topOffset,
  rightOffset,
}: MoreOptionsMenuProps) {
  const accentColor = useAccentColor();

  if (!visible) {
    return null;
  }

  return (
    <>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.panel, { top: topOffset, right: rightOffset }]}>
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
    width: 220,
    backgroundColor: 'rgba(20,20,20,0.95)',
    borderRadius: 12,
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
