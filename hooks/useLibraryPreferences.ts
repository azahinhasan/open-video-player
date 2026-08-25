import { create } from 'zustand';

import { readLibraryPreferences, writeLibraryPreferences } from '@/utils/libraryPreferences';

type LibraryPreferencesState = {
  autoRefreshOnLaunch: boolean;
  setAutoRefreshOnLaunch: (value: boolean) => void;
};

const initial = readLibraryPreferences();

export const useLibraryPreferences = create<LibraryPreferencesState>((set) => ({
  autoRefreshOnLaunch: initial.autoRefreshOnLaunch,
  setAutoRefreshOnLaunch: (autoRefreshOnLaunch) => {
    set({ autoRefreshOnLaunch });
    writeLibraryPreferences({ autoRefreshOnLaunch });
  },
}));
