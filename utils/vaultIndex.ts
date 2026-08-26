import { File, Paths } from 'expo-file-system';

import type { VaultEntry, VaultPendingOp } from '@/types/vault';

const INDEX_FILE_NAME = 'vault-index.json';
const PENDING_FILE_NAME = 'vault-pending.json';

function indexFile(): File {
  return new File(Paths.document, INDEX_FILE_NAME);
}

function pendingFile(): File {
  return new File(Paths.document, PENDING_FILE_NAME);
}

function isVaultEntry(value: unknown): value is VaultEntry {
  const v = value as Partial<VaultEntry> | null;
  return !!v && typeof v.id === 'string' && typeof v.originalFilename === 'string' && typeof v.extension === 'string';
}

export function readVaultIndex(): VaultEntry[] {
  try {
    const file = indexFile();
    if (!file.exists) {
      return [];
    }
    const parsed = JSON.parse(file.textSync());
    return Array.isArray(parsed) ? parsed.filter(isVaultEntry) : [];
  } catch {
    return [];
  }
}

export function writeVaultIndex(entries: VaultEntry[]): void {
  try {
    indexFile().write(JSON.stringify(entries));
  } catch {
    // Best-effort persistence — matches the rest of the app's convention.
    // Crash-safety for in-flight operations is handled by the pending
    // journal below, not by this write succeeding.
  }
}

function isVaultPendingOp(value: unknown): value is VaultPendingOp {
  const v = value as Partial<VaultPendingOp> | null;
  return !!v && (v.kind === 'vault-in' || v.kind === 'vault-out') && typeof v.stage === 'string';
}

export function readVaultPending(): VaultPendingOp[] {
  try {
    const file = pendingFile();
    if (!file.exists) {
      return [];
    }
    const parsed = JSON.parse(file.textSync());
    return Array.isArray(parsed) ? parsed.filter(isVaultPendingOp) : [];
  } catch {
    return [];
  }
}

/**
 * Synchronous, blocking write — deliberately not fire-and-forget like the
 * rest of the app's persistence. This journal exists specifically to survive
 * a process kill mid-operation, so every stage transition must land on disk
 * before the caller proceeds to the next step (copy, delete, etc).
 */
export function writeVaultPending(ops: VaultPendingOp[]): void {
  pendingFile().write(JSON.stringify(ops));
}
