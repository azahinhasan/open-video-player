import { create } from 'zustand';

import { ACCENT_COLORS, type AccentColorKey } from '@/constants/theme';
import { readThemePreference, writeThemePreference, type ThemeMode } from '@/utils/themePreference';

type ThemePreferenceState = {
  mode: ThemeMode;
  accent: AccentColorKey;
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: AccentColorKey) => void;
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
  return useThemePreference((s) => ACCENT_COLORS[s.accent]);
}
