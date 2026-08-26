import { File, Paths } from 'expo-file-system';

const PREFS_FILE_NAME = 'vault-auth-prefs.json';

export type VaultAuthPrefs = {
  biometricsEnabled: boolean;
  /**
   * Must be persisted (not just kept in memory) — a force-quit must not be
   * able to reset a rate-limit lockout early.
   */
  failedAttempts: number;
  lockedUntil: number | null;
};

const DEFAULT_PREFS: VaultAuthPrefs = {
  biometricsEnabled: true,
  failedAttempts: 0,
  lockedUntil: null,
};

function prefsFile(): File {
  return new File(Paths.document, PREFS_FILE_NAME);
}

export function readVaultAuthPrefs(): VaultAuthPrefs {
  try {
    const file = prefsFile();
    if (!file.exists) {
      return { ...DEFAULT_PREFS };
    }
    const parsed = JSON.parse(file.textSync());
    return {
      biometricsEnabled:
        typeof parsed?.biometricsEnabled === 'boolean' ? parsed.biometricsEnabled : DEFAULT_PREFS.biometricsEnabled,
      failedAttempts: typeof parsed?.failedAttempts === 'number' ? parsed.failedAttempts : 0,
      lockedUntil: typeof parsed?.lockedUntil === 'number' ? parsed.lockedUntil : null,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function writeVaultAuthPrefs(prefs: VaultAuthPrefs): void {
  try {
    prefsFile().write(JSON.stringify(prefs));
  } catch {
    // Best-effort persistence — matches the rest of the app's convention.
  }
}
