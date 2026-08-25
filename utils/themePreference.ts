import { File, Paths } from 'expo-file-system';

import type { AccentColorKey } from '@/constants/theme';

const PREFERENCE_FILE_NAME = 'theme-preference.json';

export type ThemeMode = 'system' | 'light' | 'dark';

export type ThemePreference = {
  mode: ThemeMode;
  accent: AccentColorKey;
};

const DEFAULT_PREFERENCE: ThemePreference = { mode: 'system', accent: 'coral' };
const VALID_MODES: ThemeMode[] = ['system', 'light', 'dark'];
const VALID_ACCENTS: AccentColorKey[] = ['coral', 'teal', 'amber', 'violet'];

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
      accent: VALID_ACCENTS.includes(parsed?.accent) ? parsed.accent : DEFAULT_PREFERENCE.accent,
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
