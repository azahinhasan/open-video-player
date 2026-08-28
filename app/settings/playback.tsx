import { Ionicons } from '@expo/vector-icons';
import { ScrollView, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/settings/Card';
import { SegmentedControl } from '@/components/settings/SegmentedControl';
import { settingsStyles as styles } from '@/components/settings/settingsStyles';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { usePlaybackPreferences } from '@/hooks/usePlaybackPreferences';
import { useAccentColor } from '@/hooks/useThemePreference';
import { useThemeColor } from '@/hooks/use-theme-color';
import { spacing } from '@/theme/tokens';
import type { ControlsLayout, DefaultOrientation, ResumeBehavior } from '@/utils/playbackPreferences';

const RESUME_OPTIONS: { value: ResumeBehavior; label: string }[] = [
  { value: 'resume', label: 'Resume' },
  { value: 'restart', label: 'Restart' },
];

const CONTROLS_LAYOUT_OPTIONS: { value: ControlsLayout; label: string }[] = [
  { value: 'center', label: 'Center' },
  { value: 'bottom', label: 'Below bar' },
];

const DEFAULT_ORIENTATION_OPTIONS: { value: DefaultOrientation; label: string }[] = [
  { value: 'portrait', label: 'Portrait' },
  { value: 'landscape', label: 'Landscape' },
];

export default function PlaybackSettingsScreen() {
  const insets = useSafeAreaInsets();
  const accentColor = useAccentColor();
  const borderColor = useThemeColor({}, 'surfaceBorder');

  const resumeBehavior = usePlaybackPreferences((s) => s.resumeBehavior);
  const setResumeBehavior = usePlaybackPreferences((s) => s.setResumeBehavior);
  const autoPlayNext = usePlaybackPreferences((s) => s.autoPlayNext);
  const setAutoPlayNext = usePlaybackPreferences((s) => s.setAutoPlayNext);
  const controlsLayout = usePlaybackPreferences((s) => s.controlsLayout);
  const setControlsLayout = usePlaybackPreferences((s) => s.setControlsLayout);
  const defaultOrientation = usePlaybackPreferences((s) => s.defaultOrientation);
  const setDefaultOrientation = usePlaybackPreferences((s) => s.setDefaultOrientation);

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}>
        <Card>
          <View style={styles.controlBlock}>
            <ThemedText style={styles.controlLabel}>When reopening a video</ThemedText>
            <SegmentedControl options={RESUME_OPTIONS} value={resumeBehavior} onChange={setResumeBehavior} />
          </View>

          <View style={[styles.rowDivider, { backgroundColor: borderColor }]} />

          <View style={styles.row}>
            <Ionicons name="play-forward-outline" size={20} color={accentColor} />
            <ThemedText style={styles.rowLabel}>Autoplay next video</ThemedText>
            <View style={styles.rowSpacer} />
            <Switch
              value={autoPlayNext}
              onValueChange={setAutoPlayNext}
              trackColor={{ false: 'rgba(128,128,128,0.3)', true: accentColor }}
              thumbColor="#fff"
            />
          </View>

          <View style={[styles.rowDivider, { backgroundColor: borderColor }]} />

          <View style={styles.controlBlock}>
            <ThemedText style={styles.controlLabel}>Player button position</ThemedText>
            <SegmentedControl
              options={CONTROLS_LAYOUT_OPTIONS}
              value={controlsLayout}
              onChange={setControlsLayout}
            />
          </View>

          <View style={[styles.rowDivider, { backgroundColor: borderColor }]} />

          <View style={styles.controlBlock}>
            <ThemedText style={styles.controlLabel}>Default orientation</ThemedText>
            <SegmentedControl
              options={DEFAULT_ORIENTATION_OPTIONS}
              value={defaultOrientation}
              onChange={setDefaultOrientation}
            />
          </View>
        </Card>
      </ScrollView>
    </ThemedView>
  );
}
