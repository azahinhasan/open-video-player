import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/settings/Card';
import { settingsStyles as styles } from '@/components/settings/settingsStyles';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useLibraryPreferences } from '@/hooks/useLibraryPreferences';
import { useAccentColor } from '@/hooks/useThemePreference';
import { useThemeColor } from '@/hooks/use-theme-color';
import { spacing } from '@/theme/tokens';

export default function LibrarySettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const accentColor = useAccentColor();
  const borderColor = useThemeColor({}, 'surfaceBorder');
  const mutedColor = useThemeColor({}, 'textMuted');

  const autoRefreshOnLaunch = useLibraryPreferences((s) => s.autoRefreshOnLaunch);
  const setAutoRefreshOnLaunch = useLibraryPreferences((s) => s.setAutoRefreshOnLaunch);
  const scanFolderIds = useLibraryPreferences((s) => s.scanFolderIds);

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}>
        <Card>
          <View style={styles.row}>
            <Ionicons name="refresh-outline" size={20} color={accentColor} />
            <ThemedText style={styles.rowLabel}>Auto-refresh on launch</ThemedText>
            <View style={styles.rowSpacer} />
            <Switch
              value={autoRefreshOnLaunch}
              onValueChange={setAutoRefreshOnLaunch}
              trackColor={{ false: 'rgba(128,128,128,0.3)', true: accentColor }}
              thumbColor="#fff"
            />
          </View>

          <View style={[styles.rowDivider, { backgroundColor: borderColor }]} />

          <Pressable style={styles.row} onPress={() => router.push('/settings/scan-folders')}>
            <Ionicons name="folder-outline" size={20} color={accentColor} />
            <View style={styles.rowSpacer}>
              <ThemedText style={styles.rowLabel}>Scan folders</ThemedText>
              <ThemedText style={[localHintStyle, { color: mutedColor }]}>
                {scanFolderIds.length === 0
                  ? 'Whole device'
                  : `${scanFolderIds.length} folder${scanFolderIds.length === 1 ? '' : 's'} selected`}
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={mutedColor} />
          </Pressable>

          <View style={[styles.rowDivider, { backgroundColor: borderColor }]} />

          <Pressable style={styles.row} onPress={() => router.push('/storage-cleanup')}>
            <Ionicons name="server-outline" size={20} color={accentColor} />
            <ThemedText style={styles.rowLabel}>Storage & cleanup</ThemedText>
            <View style={styles.rowSpacer} />
            <Ionicons name="chevron-forward" size={18} color={mutedColor} />
          </Pressable>
        </Card>
      </ScrollView>
    </ThemedView>
  );
}

const localHintStyle = { fontSize: 12, marginTop: 2 };
