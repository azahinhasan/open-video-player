import { create } from 'zustand';

import { useVideoLibraryStore } from '@/hooks/useVideoLibrary';
import type { VaultEntry } from '@/types/vault';
import type { VideoAsset } from '@/types/video';
import { readVaultIndex } from '@/utils/vaultIndex';
import { moveManyToVault, moveOutOfVault, reconcilePendingOperations } from '@/utils/vaultStorage';

type VaultStoreState = {
  entries: VaultEntry[];
  initialized: boolean;
  init: () => void;
  vaultVideos: (
    videos: VideoAsset[],
    folderNameOf: (video: VideoAsset) => string
  ) => Promise<{ committedCount: number; failedCount: number }>;
  unvaultEntry: (entry: VaultEntry) => Promise<boolean>;
};

export const useVaultStoreInstance = create<VaultStoreState>((set, get) => ({
  entries: [],
  initialized: false,

  init: () => {
    if (get().initialized) {
      return;
    }
    set({ initialized: true });
    // Must run before the index is read — resolves any move interrupted by
    // a force-quit to a consistent state (fully vaulted or fully rolled
    // back) before the UI shows anything.
    reconcilePendingOperations();
    set({ entries: readVaultIndex() });
  },

  vaultVideos: async (videos, folderNameOf) => {
    const { committed, failedCount } = await moveManyToVault(videos, folderNameOf);
    if (committed.length > 0) {
      set({ entries: [...get().entries, ...committed.map((c) => c.entry)] });
      useVideoLibraryStore.getState().removeVideosFromState(committed.map((c) => c.sourceVideoId));
    }
    return { committedCount: committed.length, failedCount };
  },

  unvaultEntry: async (entry) => {
    const result = await moveOutOfVault(entry);
    if (result.ok) {
      set({ entries: get().entries.filter((e) => e.id !== entry.id) });
      // No MediaLibrary.addListener in this app — the library store only
      // learns about MediaStore changes it's told about, so tell it.
      useVideoLibraryStore.getState().rescan({ silent: true });
    }
    return result.ok;
  },
}));

export function useVaultStore() {
  const entries = useVaultStoreInstance((s) => s.entries);
  const init = useVaultStoreInstance((s) => s.init);
  const vaultVideos = useVaultStoreInstance((s) => s.vaultVideos);
  const unvaultEntry = useVaultStoreInstance((s) => s.unvaultEntry);

  return { entries, init, vaultVideos, unvaultEntry };
}
