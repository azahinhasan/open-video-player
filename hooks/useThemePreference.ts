import { create } from 'zustand';

import { readThemePreference, writeThemePreference, type ThemeMode } from '@/utils/themePreference';

type ThemePreferenceState = {
  mode: ThemeMode;
  /** Hex color — one of the presets, or a user-picked custom color. */
  accent: string;
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: string) => void;
};

const initial = readThemePreference();

export const useThemePreference = create<ThemePreferenceState>((set, get) => ({
  mode: initial.mode,
  accent: initial.accent,
  setMode: (mode) => {
    set({ mode });
    writeThemePreference({ mode, accent: get().accent });
  },
  setAccent: (accent) => {
    set({ accent });
    writeThemePreference({ mode: get().mode, accent });
  },
}));

export function useAccentColor(): string {
  return useThemePreference((s) => s.accent);
}
