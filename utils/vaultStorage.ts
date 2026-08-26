import { Directory, File, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as Crypto from 'expo-crypto';
import MediaVaultDelete from 'media-vault-delete';

import type { VideoAsset } from '@/types/video';
import type { VaultEntry, VaultPendingOp } from '@/types/vault';
import { splitFilename } from '@/utils/renameVideo';
import { readVaultIndex, readVaultPending, writeVaultIndex, writeVaultPending } from '@/utils/vaultIndex';

/**
 * Deletes the given MediaStore video assets + their underlying files,
 * showing Android's system delete-consent dialog once for the whole batch.
 * Backed by the local `media-vault-delete` native module (see
 * modules/media-vault-delete), which calls `MediaStore.createDeleteRequest`
 * directly rather than relying on expo-media-library's internal handling of
 * that same flow — this app's minSdkVersion is 31 (Android 12), so the
 * createDeleteRequest path (API 30+) is the only one ever reachable; there's
 * no need to also branch for the Android 10 RecoverableSecurityException
 * flow or the legacy pre-scoped-storage delete, since this app can't
 * install on those OS versions at all.
 */
async function deleteOriginalAssets(assetIds: string[]): Promise<boolean> {
  try {
    return await MediaVaultDelete.deleteAssetsAsync(assetIds);
  } catch {
    return false;
  }
}

function vaultDirectory(): Directory {
  const dir = new Directory(Paths.document, 'vault');
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

function vaultThumbnailsDirectory(): Directory {
  const dir = new Directory(vaultDirectory(), 'thumbnails');
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

function vaultFileFor(entry: Pick<VaultEntry, 'id' | 'extension'>): File {
  return new File(vaultDirectory(), `${entry.id}${entry.extension}`);
}

/** The playable file:// uri for a committed vault entry. */
export function vaultFileUri(entry: Pick<VaultEntry, 'id' | 'extension'>): string {
  return vaultFileFor(entry).uri;
}

function thumbnailFileFor(id: string): File {
  return new File(vaultThumbnailsDirectory(), `${id}.jpg`);
}

function deleteVaultFiles(entry: Pick<VaultEntry, 'id' | 'extension'>): void {
  try {
    const file = vaultFileFor(entry);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // Best-effort cleanup.
  }
  try {
    const thumb = thumbnailFileFor(entry.id);
    if (thumb.exists) {
      thumb.delete();
    }
  } catch {
    // Best-effort cleanup.
  }
}

function pendingOpKey(op: VaultPendingOp): string {
  return op.kind === 'vault-in' ? op.entry.id : op.entryId;
}

/**
 * Insert-or-replace by id — used for both the first write of a pending
 * marker and every subsequent stage-transition rewrite. Synchronous: by the
 * time this returns, the write syscall for the journal has been issued, so a
 * process kill immediately after still leaves a consistent on-disk journal
 * to recover from.
 */
function writeSinglePendingOp(op: VaultPendingOp): void {
  const key = pendingOpKey(op);
  const ops = readVaultPending().filter((o) => !(o.kind === op.kind && pendingOpKey(o) === key));
  ops.push(op);
  writeVaultPending(ops);
}

function clearPendingOp(kind: VaultPendingOp['kind'], id: string): void {
  const ops = readVaultPending().filter((o) => !(o.kind === kind && pendingOpKey(o) === id));
  writeVaultPending(ops);
}

/**
 * Insert-or-replace multiple markers in a single read-modify-write, instead
 * of one writeSinglePendingOp() call per entry. This matters specifically
 * for the "mark as deleted-original" step after a *batch* delete: that one
 * MediaLibrary.deleteAssetsAsync call either deletes every id in the batch
 * or none of them, so the fact "the original is gone" becomes true for every
 * entry at the same instant. Journaling that with N separate synchronous
 * writes would leave a real crash window where some entries are already
 * updated and others still say 'copied' — and reconcilePendingOperations()
 * would then wrongly treat those as "original never touched" and roll back
 * (delete) an already-orphaned vault copy, losing the video. One combined
 * write closes that window.
 */
function writeManyPendingOps(newOps: VaultPendingOp[]): void {
  if (newOps.length === 0) {
    return;
  }
  const keyOf = (o: VaultPendingOp) => `${o.kind}:${pendingOpKey(o)}`;
  const newKeys = new Set(newOps.map(keyOf));
  const existing = readVaultPending().filter((o) => !newKeys.has(keyOf(o)));
  writeVaultPending([...existing, ...newOps]);
}

function readFileSize(uri: string): number {
  try {
    const size = new File(uri).size;
    return typeof size === 'number' && size > 0 ? size : 0;
  } catch {
    return 0;
  }
}

type PreparedVaultCopy = { video: VideoAsset; entry: VaultEntry };

/**
 * Generates the thumbnail and copies the file bytes into vault/ storage, and
 * journals the operation as it goes — but does NOT touch the original file
 * or its MediaStore entry. Returns null (after cleaning up after itself) if
 * the copy failed outright.
 */
async function prepareVaultCopy(video: VideoAsset, originalFolder: string): Promise<PreparedVaultCopy | null> {
  const id = Crypto.randomUUID();
  const { extension } = splitFilename(video.filename);

  // Generated before the original is touched, so the thumbnail never
  // depends on the original file continuing to exist.
  let thumbnailPath: string | null = null;
  try {
    const result = await VideoThumbnails.getThumbnailAsync(video.uri, { quality: 0.5 });
    const thumbFile = thumbnailFileFor(id);
    new File(result.uri).copy(thumbFile);
    thumbnailPath = thumbFile.uri;
  } catch {
    thumbnailPath = null;
  }

  const entry: VaultEntry = {
    id,
    originalFilename: video.filename,
    originalFolder,
    extension,
    durationSeconds: video.duration ?? 0,
    sizeBytes: readFileSize(video.uri),
    dateVaulted: new Date().toISOString(),
    thumbnailPath,
  };

  writeSinglePendingOp({ kind: 'vault-in', stage: 'copying', entry, sourceAssetId: video.id, startedAt: Date.now() });

  try {
    new File(video.uri).copy(vaultFileFor(entry));
  } catch {
    deleteVaultFiles(entry);
    clearPendingOp('vault-in', entry.id);
    return null;
  }

  writeSinglePendingOp({ kind: 'vault-in', stage: 'copied', entry, sourceAssetId: video.id, startedAt: Date.now() });
  return { video, entry };
}

function commitVaultEntries(entries: VaultEntry[]): void {
  if (entries.length === 0) {
    return;
  }
  const index = readVaultIndex();
  index.push(...entries);
  writeVaultIndex(index);
}

export type MoveToVaultResult =
  | { ok: true; entry: VaultEntry }
  | { ok: false; reason: 'copy-failed' | 'delete-declined' };

/**
 * Moves a single video into the vault: copy bytes into private storage,
 * delete the original + its MediaStore entry (via the media-vault-delete
 * native module, which shows the Android delete-consent dialog), then
 * commit the vault index entry. If the delete is declined/fails, rolls the
 * copy back so neither both copies nor an unconfirmed private copy is ever
 * left behind.
 */
export async function moveToVault(video: VideoAsset, originalFolder: string): Promise<MoveToVaultResult> {
  const prepared = await prepareVaultCopy(video, originalFolder);
  if (!prepared) {
    return { ok: false, reason: 'copy-failed' };
  }

  const deleted = await deleteOriginalAssets([video.id]);

  if (!deleted) {
    deleteVaultFiles(prepared.entry);
    clearPendingOp('vault-in', prepared.entry.id);
    return { ok: false, reason: 'delete-declined' };
  }

  writeSinglePendingOp({
    kind: 'vault-in',
    stage: 'deleted-original',
    entry: prepared.entry,
    sourceAssetId: video.id,
    startedAt: Date.now(),
  });
  commitVaultEntries([prepared.entry]);
  clearPendingOp('vault-in', prepared.entry.id);

  return { ok: true, entry: prepared.entry };
}

export type MoveManyToVaultResult = {
  committed: { sourceVideoId: string; entry: VaultEntry }[];
  failedCount: number;
};

/**
 * Batch version of moveToVault. Copies every video first, then issues ONE
 * delete call for all of them together — Android's delete-consent dialog
 * covers a whole batch of ids in one prompt, so doing this one-at-a-time
 * would show the user N separate system dialogs instead of one. If the
 * batch delete is declined, every prepared copy is rolled back (Android
 * doesn't report which items were/weren't deleted, so a non-true result is
 * treated as "nothing was deleted" — matching how hooks/useVideoLibrary.ts's
 * own deleteVideos() already treats expo-media-library's version of this).
 */
export async function moveManyToVault(
  videos: VideoAsset[],
  folderNameOf: (video: VideoAsset) => string
): Promise<MoveManyToVaultResult> {
  const prepared: PreparedVaultCopy[] = [];
  let failedCount = 0;

  for (const video of videos) {
    const result = await prepareVaultCopy(video, folderNameOf(video));
    if (result) {
      prepared.push(result);
    } else {
      failedCount += 1;
    }
  }

  if (prepared.length === 0) {
    return { committed: [], failedCount };
  }

  const deleted = await deleteOriginalAssets(prepared.map((p) => p.video.id));

  if (!deleted) {
    for (const { entry } of prepared) {
      deleteVaultFiles(entry);
      clearPendingOp('vault-in', entry.id);
    }
    return { committed: [], failedCount: failedCount + prepared.length };
  }

  const now = Date.now();
  writeManyPendingOps(
    prepared.map(({ video, entry }) => ({
      kind: 'vault-in' as const,
      stage: 'deleted-original' as const,
      entry,
      sourceAssetId: video.id,
      startedAt: now,
    }))
  );
  commitVaultEntries(prepared.map((p) => p.entry));
  for (const { entry } of prepared) {
    clearPendingOp('vault-in', entry.id);
  }

  return {
    committed: prepared.map((p) => ({ sourceVideoId: p.video.id, entry: p.entry })),
    failedCount,
  };
}

export type MoveOutOfVaultResult = { ok: true } | { ok: false; reason: 'create-failed' };

/**
 * Reverses moveToVault: writes the file back into shared storage (re-indexed
 * into MediaStore via createAssetAsync, landing in the OS's default video
 * location), then removes the private copy + index entry. Only deletes the
 * vault copy after createAssetAsync succeeds, so a crash mid-restore never
 * loses the video — at worst it can be retried.
 */
export async function moveOutOfVault(entry: VaultEntry): Promise<MoveOutOfVaultResult> {
  writeSinglePendingOp({ kind: 'vault-out', stage: 'restoring', entryId: entry.id, startedAt: Date.now() });

  let asset: MediaLibrary.Asset | null = null;
  try {
    asset = await MediaLibrary.createAssetAsync(vaultFileFor(entry).uri);
  } catch {
    asset = null;
  }

  if (!asset) {
    clearPendingOp('vault-out', entry.id);
    return { ok: false, reason: 'create-failed' };
  }

  writeSinglePendingOp({
    kind: 'vault-out',
    stage: 'restored',
    entryId: entry.id,
    restoredAssetId: asset.id,
    startedAt: Date.now(),
  });

  deleteVaultFiles(entry);
  writeVaultIndex(readVaultIndex().filter((e) => e.id !== entry.id));
  clearPendingOp('vault-out', entry.id);

  return { ok: true };
}

/**
 * Permanently deletes a vaulted video — no MediaStore interaction, no
 * restore, irreversible. Unlike moveToVault/moveOutOfVault there's no
 * "recreate" step this could race with, so it doesn't need the pending
 * journal: the index entry is dropped first (so the UI can never show a
 * phantom entry pointing at a file that's already gone), then the files are
 * cleaned up. If a crash lands between those two steps, the only possible
 * leftover is an orphaned, unreferenced file on disk — never a broken list
 * entry and never data thought-deleted-but-not.
 */
export function deleteVaultEntry(entry: VaultEntry): void {
  writeVaultIndex(readVaultIndex().filter((e) => e.id !== entry.id));
  deleteVaultFiles(entry);
}

/**
 * Crash recovery — must be called once (from useVaultStore.init()) before
 * anything else reads the vault index. Walks the write-ahead journal left by
 * moveToVault/moveManyToVault/moveOutOfVault and resolves every entry to one
 * of two terminal states: fully committed, or fully rolled back. Never
 * leaves both a vault copy and the original present, and never leaves an
 * orphaned, un-indexed private file.
 */
export function reconcilePendingOperations(): void {
  const ops = readVaultPending();
  if (ops.length === 0) {
    return;
  }

  let index = readVaultIndex();
  const committedIds = new Set(index.map((e) => e.id));
  const toRemove = new Set<string>();
  let indexChanged = false;

  for (const op of ops) {
    if (op.kind === 'vault-in') {
      if (op.stage === 'deleted-original' && !committedIds.has(op.entry.id)) {
        // The (irreversible) delete already happened but the commit write
        // never landed — promote the already-complete entry into the index.
        index.push(op.entry);
        committedIds.add(op.entry.id);
        indexChanged = true;
      } else if (op.stage === 'copying' || op.stage === 'copied') {
        // Original was never touched — discard the partial copy.
        deleteVaultFiles(op.entry);
      }
      continue;
    }

    // vault-out
    if (op.stage === 'restored') {
      // The MediaStore asset already exists — finish removing the vault copy.
      toRemove.add(op.entryId);
      indexChanged = true;
    }
    // stage === 'restoring': unknown whether createAssetAsync committed
    // before the crash. Safe choice: leave the entry in the vault as-is
    // (still playable) so un-vaulting can simply be retried, rather than
    // risk creating a duplicate MediaStore asset.
  }

  if (toRemove.size > 0) {
    for (const entry of index) {
      if (toRemove.has(entry.id)) {
        deleteVaultFiles(entry);
      }
    }
    index = index.filter((e) => !toRemove.has(e.id));
  }

  if (indexChanged) {
    writeVaultIndex(index);
  }
  writeVaultPending([]);
}
