import { create } from 'zustand';

import {
  readSubtitleStylePreference,
  writeSubtitleStylePreference,
  type SubtitleBackgroundOpacity,
  type SubtitleFontSize,
} from '@/utils/subtitleStylePreferences';

type SubtitleStyleState = {
  fontSize: SubtitleFontSize;
  bold: boolean;
  textColor: string;
  backgroundColor: string;
  backgroundOpacity: SubtitleBackgroundOpacity;
  setFontSize: (fontSize: SubtitleFontSize) => void;
  setBold: (bold: boolean) => void;
  setTextColor: (hex: string) => void;
  setBackgroundColor: (hex: string) => void;
  setBackgroundOpacity: (opacity: SubtitleBackgroundOpacity) => void;
};

const initial = readSubtitleStylePreference();

function persist(state: SubtitleStyleState): void {
  writeSubtitleStylePreference({
    fontSize: state.fontSize,
    bold: state.bold,
    textColor: state.textColor,
    backgroundColor: state.backgroundColor,
    backgroundOpacity: state.backgroundOpacity,
  });
}

export const useSubtitleStylePreferences = create<SubtitleStyleState>((set, get) => ({
  fontSize: initial.fontSize,
  bold: initial.bold,
  textColor: initial.textColor,
  backgroundColor: initial.backgroundColor,
  backgroundOpacity: initial.backgroundOpacity,
  setFontSize: (fontSize) => {
    set({ fontSize });
    persist(get());
  },
  setBold: (bold) => {
    set({ bold });
    persist(get());
  },
  setTextColor: (textColor) => {
    set({ textColor });
    persist(get());
  },
  setBackgroundColor: (backgroundColor) => {
    set({ backgroundColor });
    persist(get());
  },
  setBackgroundOpacity: (backgroundOpacity) => {
    set({ backgroundOpacity });
    persist(get());
  },
}));
