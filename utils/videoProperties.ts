import { File } from 'expo-file-system';

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return 'Unknown';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

/**
 * Best-effort file size lookup. Scoped storage can deny raw filesystem stat
 * access to media the app doesn't own, so this quietly returns null instead
 * of throwing when that happens.
 */
export function getFileSize(uri: string): number | null {
  try {
    const size = new File(uri).size;
    return typeof size === 'number' && size > 0 ? size : null;
  } catch {
    return null;
  }
}

export function formatDate(epochMillis: number | null): string {
  if (!epochMillis) {
    return 'Unknown';
  }
  const date = new Date(epochMillis);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }
  return date.toLocaleString();
}

/**
 * The containing folder path on disk, derived from the asset's `file://` URI
 * (Android's MediaStore-vended asset URIs are plain file paths, not opaque
 * content URIs, so this is safe to do with simple string manipulation).
 */
export function getFileDirectory(uri: string): string {
  const path = decodeURIComponent(uri.replace(/^file:\/\//, ''));
  const lastSlash = path.lastIndexOf('/');
  return lastSlash > 0 ? path.slice(0, lastSlash) : path;
}

const NEW_BADGE_WINDOW_MS = 5 * 24 * 60 * 60 * 1000;

export function isRecentlyAdded(creationTime: number | null): boolean {
  if (!creationTime) {
    return false;
  }
  return Date.now() - creationTime <= NEW_BADGE_WINDOW_MS;
}
