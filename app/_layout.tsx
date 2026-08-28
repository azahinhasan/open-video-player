import { DarkTheme, DefaultTheme, ThemeProvider, type Theme } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastHost } from '@/components/ToastHost';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAccentColor } from '@/hooks/useThemePreference';
import { themeColors } from '@/theme/tokens';

export const unstable_settings = {
  anchor: 'index',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const accentColor = useAccentColor();

  // React Navigation only ships Default/Dark — Warm is a third, light-ish
  // palette this app defines itself (see theme/tokens.ts), so it needs its
  // own Theme object built the same shape, rather than reusing either.
  const warmNavigationTheme: Theme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: accentColor,
      background: themeColors.warm.background,
      card: themeColors.warm.surface,
      text: themeColors.warm.text,
      border: themeColors.warm.surfaceBorder,
    },
  };

  const navigationTheme =
    colorScheme === 'dark' ? DarkTheme : colorScheme === 'warm' ? warmNavigationTheme : DefaultTheme;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={navigationTheme}>
          <Stack>
            <Stack.Screen name="index" options={{ title: 'Library' }} />
            <Stack.Screen name="folder/[id]" options={{ title: 'Videos' }} />
            <Stack.Screen name="search" options={{ title: 'Search' }} />
            <Stack.Screen name="settings" options={{ headerShown: false }} />
            <Stack.Screen name="storage-cleanup" options={{ title: 'Storage & cleanup' }} />
            <Stack.Screen name="vault" options={{ headerShown: false }} />
            <Stack.Screen
              name="player/[id]"
              options={{ headerShown: false, animation: 'fade' }}
            />
          </Stack>
          <ToastHost />
          <StatusBar style="auto" />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
