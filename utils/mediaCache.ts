import { File, Paths } from 'expo-file-system';

import type { VideoAsset } from '@/types/video';

const CACHE_FILE_NAME = 'media-cache.json';

export type MediaCache = {
  videos: VideoAsset[];
  folderNames: Record<string, string>;
};

const EMPTY_CACHE: MediaCache = { videos: [], folderNames: {} };

function cacheFile(): File {
  return new File(Paths.document, CACHE_FILE_NAME);
}

function isVideoAsset(value: unknown): value is VideoAsset {
  const v = value as Partial<VideoAsset> | null;
  return !!v && typeof v.id === 'string' && typeof v.uri === 'string' && typeof v.folderId === 'string';
}

/**
 * Async on purpose — the library's full metadata (every video's uri,
 * filename, thumbnail path, etc.) can grow into a sizeable file for a large
 * library, and reading it synchronously at module-load time blocked the JS
 * thread before the first frame could render, keeping the native splash
 * screen up longer than it should. Callers read this inside an effect
 * (after mount) instead of at import time.
 */
export async function readMediaCache(): Promise<MediaCache> {
  try {
    const file = cacheFile();
    if (!file.exists) {
      return { ...EMPTY_CACHE };
    }
    const parsed = JSON.parse(await file.text());
    const videos = Array.isArray(parsed?.videos) ? parsed.videos.filter(isVideoAsset) : [];
    const folderNames =
      parsed?.folderNames && typeof parsed.folderNames === 'object' ? parsed.folderNames : {};
    return { videos, folderNames };
  } catch {
    return { ...EMPTY_CACHE };
  }
}

export function writeMediaCache(cache: MediaCache): void {
  try {
    cacheFile().write(JSON.stringify(cache));
  } catch {
    // Best-effort persistence — a failed write just means a fresh scan next launch.
  }
}
