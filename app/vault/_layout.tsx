import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { VaultLockScreen } from '@/components/vault/VaultLockScreen';
import { VaultSetupScreen } from '@/components/vault/VaultSetupScreen';
import { useVaultAuthStore } from '@/hooks/useVaultAuthStore';
import { useVaultStoreInstance } from '@/hooks/useVaultStore';

/**
 * The Vault's security boundary. Renders PIN setup, the lock screen, or the
 * unlocked vault stack based on auth state — nothing under app/vault/index
 * or app/vault/player ever mounts unless `unlocked` is true.
 *
 * Owns the AppState listener that re-locks on backgrounding, scoped to this
 * layout's own mount lifetime (mirrors app/player/[id].tsx's scoped
 * listener) so "re-lock only while Vault is open" holds without a global
 * listener having to separately track whether the vault route is active.
 * Playback of a vaulted video happens on a route nested under this layout
 * (app/vault/player/[id]) specifically so it's covered by this same
 * re-lock — see components/player/PlayerScreen.tsx's playerBasePath prop.
 */
export default function VaultLayout() {
  const initialized = useVaultAuthStore((s) => s.initialized);
  const hasPin = useVaultAuthStore((s) => s.hasPin);
  const unlocked = useVaultAuthStore((s) => s.unlocked);
  const authInit = useVaultAuthStore((s) => s.init);
  const lock = useVaultAuthStore((s) => s.lock);

  useEffect(() => {
    authInit();
    useVaultStoreInstance.getState().init();
  }, [authInit]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background') {
        lock();
      }
    });
    return () => subscription.remove();
  }, [lock]);

  if (!initialized) {
    return <ThemedView style={{ flex: 1 }} />;
  }

  if (!hasPin) {
    return <VaultSetupScreen />;
  }

  if (!unlocked) {
    return <VaultLockScreen />;
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Vault' }} />
      <Stack.Screen name="player/[id]" options={{ headerShown: false, animation: 'fade' }} />
    </Stack>
  );
}
