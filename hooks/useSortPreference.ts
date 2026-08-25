import { create } from 'zustand';

import { readSortPreference, writeSortPreference, type SortMode } from '@/utils/sortPreference';

export type { SortMode };

type SortPreferenceState = {
  sortMode: SortMode;
  setSortMode: (mode: SortMode) => void;
};

export const useSortPreference = create<SortPreferenceState>((set) => ({
  sortMode: readSortPreference(),
  setSortMode: (sortMode) => {
    set({ sortMode });
    writeSortPreference(sortMode);
  },
}));
