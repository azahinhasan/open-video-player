import { create } from 'zustand';

import { useVideoLibraryStore } from '@/hooks/useVideoLibrary';
import type { VaultEntry } from '@/types/vault';
import type { VideoAsset } from '@/types/video';
import { readVaultIndex } from '@/utils/vaultIndex';
import { deleteVaultEntry, moveManyToVault, moveOutOfVault, reconcilePendingOperations } from '@/utils/vaultStorage';

type VaultStoreState = {
  entries: VaultEntry[];
  initialized: boolean;
  init: () => void;
  vaultVideos: (
    videos: VideoAsset[],
    folderNameOf: (video: VideoAsset) => string
  ) => Promise<{ committedCount: number; failedCount: number }>;
  unvaultEntry: (entry: VaultEntry) => Promise<boolean>;
  unvaultEntries: (entries: VaultEntry[]) => Promise<{ successCount: number; failedCount: number }>;
  deleteEntries: (entries: VaultEntry[]) => void;
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
    const { successCount } = await get().unvaultEntries([entry]);
    return successCount > 0;
  },

  unvaultEntries: async (entries) => {
    // moveOutOfVault's createAssetAsync has no user-facing consent dialog
    // (unlike the vault-in delete step), so there's no UX reason to batch
    // these into one call — sequential is simplest and keeps each one's
    // crash-safety journaling independent of the others.
    let successCount = 0;
    let failedCount = 0;
    const restoredIds = new Set<string>();
    for (const entry of entries) {
      const result = await moveOutOfVault(entry);
      if (result.ok) {
        successCount += 1;
        restoredIds.add(entry.id);
      } else {
        failedCount += 1;
      }
    }
    if (restoredIds.size > 0) {
      set({ entries: get().entries.filter((e) => !restoredIds.has(e.id)) });
      // No MediaLibrary.addListener in this app — the library store only
      // learns about MediaStore changes it's told about, so tell it.
      useVideoLibraryStore.getState().rescan({ silent: true });
    }
    return { successCount, failedCount };
  },

  deleteEntries: (entries) => {
    if (entries.length === 0) {
      return;
    }
    for (const entry of entries) {
      deleteVaultEntry(entry);
    }
    const deletedIds = new Set(entries.map((e) => e.id));
    set({ entries: get().entries.filter((e) => !deletedIds.has(e.id)) });
  },
}));

export function useVaultStore() {
  const entries = useVaultStoreInstance((s) => s.entries);
  const init = useVaultStoreInstance((s) => s.init);
  const vaultVideos = useVaultStoreInstance((s) => s.vaultVideos);
  const unvaultEntry = useVaultStoreInstance((s) => s.unvaultEntry);
  const unvaultEntries = useVaultStoreInstance((s) => s.unvaultEntries);
  const deleteEntries = useVaultStoreInstance((s) => s.deleteEntries);

  return { entries, init, vaultVideos, unvaultEntry, unvaultEntries, deleteEntries };
}
