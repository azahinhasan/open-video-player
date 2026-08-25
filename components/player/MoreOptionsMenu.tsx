import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { VideoZoomMode } from '@/components/player/VideoPlayer';

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

const ZOOM_LABELS: Record<VideoZoomMode, string> = {
  contain: 'Fit',
  cover: 'Fill',
  stretch: 'Stretch',
};

type MoreOptionsMenuProps = {
  visible: boolean;
  onClose: () => void;
  rate: number;
  onRateChange: (rate: number) => void;
  loop: boolean;
  onToggleLoop: () => void;
  zoomMode: VideoZoomMode;
  onCycleZoomMode: () => void;
  hasSubtitle: boolean;
  subtitlesEnabled: boolean;
  onToggleSubtitles: () => void;
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
  zoomMode,
  onCycleZoomMode,
  hasSubtitle,
  subtitlesEnabled,
  onToggleSubtitles,
  topOffset,
  rightOffset,
}: MoreOptionsMenuProps) {
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
              style={[styles.speedChip, option === rate ? styles.speedChipActive : null]}
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

        <Pressable style={styles.row} onPress={onCycleZoomMode}>
          <Ionicons name="scan-outline" size={18} color="#fff" />
          <Text style={styles.rowText}>Aspect ratio</Text>
          <View style={styles.rowSpacer} />
          <Text style={styles.rowValue}>{ZOOM_LABELS[zoomMode]}</Text>
        </Pressable>

        {hasSubtitle ? (
          <Pressable style={styles.row} onPress={onToggleSubtitles}>
            <Ionicons name="chatbox-outline" size={18} color="#fff" />
            <Text style={styles.rowText}>Subtitles</Text>
            <View style={styles.rowSpacer} />
            <Ionicons name={subtitlesEnabled ? 'checkbox' : 'square-outline'} size={18} color="#fff" />
          </Pressable>
        ) : null}
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
  speedChipActive: {
    backgroundColor: '#F97316',
  },
  speedChipText: {
    color: '#fff',
    fontSize: 12,
  },
  speedChipTextActive: {
    fontWeight: '700',
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
  rowValue: {
    color: '#aaa',
    fontSize: 12,
  },
});
