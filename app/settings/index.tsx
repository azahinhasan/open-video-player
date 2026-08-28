import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/settings/Card';
import { settingsStyles as styles } from '@/components/settings/settingsStyles';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { spacing } from '@/theme/tokens';

type SettingsGroup = {
  href: '/settings/playback' | '/settings/subtitles' | '/settings/appearance' | '/settings/library' | '/settings/vault-security';
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
};

const GROUPS: SettingsGroup[] = [
  {
    href: '/settings/playback',
    icon: 'play-outline',
    title: 'Playback',
    description: 'Resume behavior, autoplay, button layout, orientation',
  },
  {
    href: '/settings/subtitles',
    icon: 'text-outline',
    title: 'Subtitles',
    description: 'Text size, weight, colors, background',
  },
  {
    href: '/settings/appearance',
    icon: 'color-palette-outline',
    title: 'Appearance',
    description: 'Theme and accent color',
  },
  {
    href: '/settings/library',
    icon: 'server-outline',
    title: 'Library & storage',
    description: 'Auto-refresh, storage & cleanup',
  },
  {
    href: '/settings/vault-security',
    icon: 'finger-print-outline',
    title: 'Vault security',
    description: 'Biometrics, PIN',
  },
];

export default function SettingsIndexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mutedColor = useThemeColor({}, 'textMuted');
  const borderColor = useThemeColor({}, 'surfaceBorder');

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}>
        <Card>
          {GROUPS.map((group, index) => (
            <View key={group.href}>
              <Pressable style={styles.row} onPress={() => router.push(group.href)}>
                <Ionicons name={group.icon} size={20} color={mutedColor} />
                <View style={styles.rowSpacer}>
                  <ThemedText style={styles.rowLabel}>{group.title}</ThemedText>
                  <ThemedText style={[groupDescriptionStyle, { color: mutedColor }]} numberOfLines={1}>
                    {group.description}
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={mutedColor} />
              </Pressable>
              {index < GROUPS.length - 1 ? (
                <View style={[styles.rowDivider, { backgroundColor: borderColor }]} />
              ) : null}
            </View>
          ))}
        </Card>
      </ScrollView>
    </ThemedView>
  );
}

const groupDescriptionStyle = { fontSize: 12, marginTop: 2 };
