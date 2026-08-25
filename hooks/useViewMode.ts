import { create } from 'zustand';

import { readViewMode, writeViewMode, type ViewMode } from '@/utils/viewModePreference';

type ViewModeState = {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  toggleViewMode: () => void;
};

export const useViewMode = create<ViewModeState>((set, get) => ({
  viewMode: readViewMode(),
  setViewMode: (mode) => {
    set({ viewMode: mode });
    writeViewMode(mode);
  },
  toggleViewMode: () => {
    const next = get().viewMode === 'grid' ? 'list' : 'grid';
    set({ viewMode: next });
    writeViewMode(next);
  },
}));
