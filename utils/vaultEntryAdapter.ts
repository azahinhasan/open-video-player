import type { VaultEntry } from '@/types/vault';
import type { VideoAsset } from '@/types/video';
import { vaultFileUri } from '@/utils/vaultStorage';

/**
 * Adapts a VaultEntry to the app's regular VideoAsset shape so vault screens
 * can reuse VideoGridItem/VideoListItem/the player unmodified. Vault entries
 * are immutable snapshots taken at vault-time, so there's no folderId in the
 * MediaStore sense (folderId: 'vault' is just a stable placeholder) and no
 * width/height (not tracked in VaultEntry — not needed for list/player UI).
 */
export function vaultEntryToVideoAsset(entry: VaultEntry): VideoAsset {
  const vaultedAt = Date.parse(entry.dateVaulted);
  const timestamp = Number.isFinite(vaultedAt) ? vaultedAt : null;
  return {
    id: entry.id,
    uri: vaultFileUri(entry),
    filename: entry.originalFilename,
    modificationTime: timestamp,
    creationTime: timestamp,
    duration: entry.durationSeconds || null,
    width: 0,
    height: 0,
    thumbnailUri: entry.thumbnailPath,
    folderId: 'vault',
  };
}
