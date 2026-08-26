export type VaultEntry = {
  id: string;
  originalFilename: string;
  originalFolder: string;
  /** Preserved from the original filename, e.g. ".mp4" — vault files keep it on disk. */
  extension: string;
  durationSeconds: number;
  sizeBytes: number;
  dateVaulted: string;
  /** file:// uri under documentDirectory/vault/thumbnails/, generated at vault-time. */
  thumbnailPath: string | null;
};

/**
 * Write-ahead journal for moveToVault/moveOutOfVault — never rendered in UI,
 * exists purely so a crash/force-quit mid-operation can be detected and
 * resolved to a consistent state on next launch. See utils/vaultStorage.ts.
 */
export type VaultPendingOp =
  | {
      kind: 'vault-in';
      stage: 'copying' | 'copied' | 'deleted-original';
      entry: VaultEntry;
      sourceAssetId: string;
      startedAt: number;
    }
  | {
      kind: 'vault-out';
      stage: 'restoring' | 'restored';
      entryId: string;
      restoredAssetId?: string;
      startedAt: number;
    };
