import { File, Paths } from 'expo-file-system';

import { accentPalette } from '@/theme/tokens';

const PREFERENCE_FILE_NAME = 'theme-preference.json';

export type ThemeMode = 'system' | 'light' | 'dark';

export type ThemePreference = {
  mode: ThemeMode;
  /** Hex color — one of the presets in theme/tokens.ts, or a user-picked custom color. */
  accent: string;
};

const DEFAULT_PREFERENCE: ThemePreference = { mode: 'system', accent: accentPalette.coral };
const VALID_MODES: ThemeMode[] = ['system', 'light', 'dark'];
const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

function preferenceFile(): File {
  return new File(Paths.document, PREFERENCE_FILE_NAME);
}

export function readThemePreference(): ThemePreference {
  try {
    const file = preferenceFile();
    if (!file.exists) {
      return { ...DEFAULT_PREFERENCE };
    }
    const parsed = JSON.parse(file.textSync());
    return {
      mode: VALID_MODES.includes(parsed?.mode) ? parsed.mode : DEFAULT_PREFERENCE.mode,
      accent:
        typeof parsed?.accent === 'string' && HEX_COLOR_RE.test(parsed.accent)
          ? parsed.accent
          : DEFAULT_PREFERENCE.accent,
    };
  } catch {
    return { ...DEFAULT_PREFERENCE };
  }
}

export function writeThemePreference(preference: ThemePreference): void {
  try {
    preferenceFile().write(JSON.stringify(preference));
  } catch {
    // Best-effort persistence — a failed write just means the choice resets next launch.
  }
}
