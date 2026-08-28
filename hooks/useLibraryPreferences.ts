import { create } from 'zustand';

import {
  readLibraryPreferences,
  writeLibraryPreferences,
  type CustomScanFolder,
} from '@/utils/libraryPreferences';

type LibraryPreferencesState = {
  autoRefreshOnLaunch: boolean;
  scanFolderIds: string[];
  customScanFolders: CustomScanFolder[];
  setAutoRefreshOnLaunch: (value: boolean) => void;
  setScanFolderIds: (ids: string[]) => void;
  addCustomScanFolder: (folder: CustomScanFolder) => void;
  removeCustomScanFolder: (uri: string) => void;
};

const initial = readLibraryPreferences();

export const useLibraryPreferences = create<LibraryPreferencesState>((set, get) => ({
  autoRefreshOnLaunch: initial.autoRefreshOnLaunch,
  scanFolderIds: initial.scanFolderIds,
  customScanFolders: initial.customScanFolders,
  setAutoRefreshOnLaunch: (autoRefreshOnLaunch) => {
    set({ autoRefreshOnLaunch });
    writeLibraryPreferences({
      autoRefreshOnLaunch,
      scanFolderIds: get().scanFolderIds,
      customScanFolders: get().customScanFolders,
    });
  },
  setScanFolderIds: (scanFolderIds) => {
    set({ scanFolderIds });
    writeLibraryPreferences({
      autoRefreshOnLaunch: get().autoRefreshOnLaunch,
      scanFolderIds,
      customScanFolders: get().customScanFolders,
    });
  },
  addCustomScanFolder: (folder) => {
    // Re-picking the same folder just replaces its entry (e.g. a refreshed
    // display name) rather than creating a duplicate row.
    const customScanFolders = [
      ...get().customScanFolders.filter((f) => f.uri !== folder.uri),
      folder,
    ];
    set({ customScanFolders });
    writeLibraryPreferences({
      autoRefreshOnLaunch: get().autoRefreshOnLaunch,
      scanFolderIds: get().scanFolderIds,
      customScanFolders,
    });
  },
  removeCustomScanFolder: (uri) => {
    const customScanFolders = get().customScanFolders.filter((f) => f.uri !== uri);
    set({ customScanFolders });
    writeLibraryPreferences({
      autoRefreshOnLaunch: get().autoRefreshOnLaunch,
      scanFolderIds: get().scanFolderIds,
      customScanFolders,
    });
  },
}));
