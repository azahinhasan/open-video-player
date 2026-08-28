import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Settings' }} />
      <Stack.Screen name="playback" options={{ title: 'Playback' }} />
      <Stack.Screen name="subtitles" options={{ title: 'Subtitles' }} />
      <Stack.Screen name="appearance" options={{ title: 'Appearance' }} />
      <Stack.Screen name="library" options={{ title: 'Library & storage' }} />
      <Stack.Screen name="vault-security" options={{ title: 'Vault security' }} />
    </Stack>
  );
}
