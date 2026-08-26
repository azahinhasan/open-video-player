import * as LocalAuthentication from 'expo-local-authentication';
import { create } from 'zustand';

import { readVaultAuthPrefs, writeVaultAuthPrefs } from '@/utils/vaultAuthPrefs';
import { hasStoredPin, savePin, verifyStoredPin } from '@/utils/vaultAuthSecure';

const MAX_ATTEMPTS_BEFORE_LOCKOUT = 5;
const LOCKOUT_MS = 30_000;

type VaultAuthState = {
  initialized: boolean;
  hasPin: boolean;
  /** In-memory only, never persisted — every cold start requires re-auth. */
  unlocked: boolean;
  failedAttempts: number;
  lockedUntil: number | null;
  biometricsAvailable: boolean;
  biometricsEnabled: boolean;
  init: () => Promise<void>;
  createPin: (pin: string) => Promise<void>;
  changePin: (pin: string) => Promise<void>;
  verifyPin: (pin: string) => Promise<boolean>;
  authenticateWithBiometrics: () => Promise<boolean>;
  lock: () => void;
  setBiometricsEnabled: (enabled: boolean) => void;
};

function persistRateLimit(state: Pick<VaultAuthState, 'biometricsEnabled' | 'failedAttempts' | 'lockedUntil'>): void {
  writeVaultAuthPrefs({
    biometricsEnabled: state.biometricsEnabled,
    failedAttempts: state.failedAttempts,
    lockedUntil: state.lockedUntil,
  });
}

export const useVaultAuthStore = create<VaultAuthState>((set, get) => ({
  initialized: false,
  hasPin: false,
  unlocked: false,
  failedAttempts: 0,
  lockedUntil: null,
  biometricsAvailable: false,
  biometricsEnabled: true,

  init: async () => {
    if (get().initialized) {
      return;
    }
    const prefs = readVaultAuthPrefs();
    const [hasPinStored, hasHardware, isEnrolled] = await Promise.all([
      hasStoredPin(),
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    set({
      initialized: true,
      hasPin: hasPinStored,
      failedAttempts: prefs.failedAttempts,
      lockedUntil: prefs.lockedUntil,
      biometricsAvailable: hasHardware && isEnrolled,
      biometricsEnabled: prefs.biometricsEnabled,
    });
  },

  createPin: async (pin) => {
    await savePin(pin);
    set({ hasPin: true, unlocked: true, failedAttempts: 0, lockedUntil: null });
    persistRateLimit({ biometricsEnabled: get().biometricsEnabled, failedAttempts: 0, lockedUntil: null });
  },

  changePin: async (pin) => {
    await savePin(pin);
  },

  verifyPin: async (pin) => {
    if (get().lockedUntil && get().lockedUntil! > Date.now()) {
      return false;
    }

    const ok = await verifyStoredPin(pin);
    if (ok) {
      set({ unlocked: true, failedAttempts: 0, lockedUntil: null });
      persistRateLimit({ biometricsEnabled: get().biometricsEnabled, failedAttempts: 0, lockedUntil: null });
      return true;
    }

    const attempts = get().failedAttempts + 1;
    const triggersLockout = attempts >= MAX_ATTEMPTS_BEFORE_LOCKOUT;
    const nextFailedAttempts = triggersLockout ? 0 : attempts;
    const nextLockedUntil = triggersLockout ? Date.now() + LOCKOUT_MS : null;
    set({ failedAttempts: nextFailedAttempts, lockedUntil: nextLockedUntil });
    persistRateLimit({
      biometricsEnabled: get().biometricsEnabled,
      failedAttempts: nextFailedAttempts,
      lockedUntil: nextLockedUntil,
    });
    return false;
  },

  authenticateWithBiometrics: async () => {
    if (!get().biometricsAvailable || !get().biometricsEnabled) {
      return false;
    }
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Vault',
        // The app already has its own PIN as the fallback — letting the OS
        // fall back to the device's own lock credential here would mix two
        // different "PIN" concepts for the user.
        disableDeviceFallback: true,
      });
      if (!result.success) {
        return false;
      }
      set({ unlocked: true, failedAttempts: 0, lockedUntil: null });
      persistRateLimit({ biometricsEnabled: get().biometricsEnabled, failedAttempts: 0, lockedUntil: null });
      return true;
    } catch {
      return false;
    }
  },

  lock: () => set({ unlocked: false }),

  setBiometricsEnabled: (enabled) => {
    set({ biometricsEnabled: enabled });
    persistRateLimit({ biometricsEnabled: enabled, failedAttempts: get().failedAttempts, lockedUntil: get().lockedUntil });
  },
}));
