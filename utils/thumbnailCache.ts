import { Directory, File, Paths } from 'expo-file-system';
import * as VideoThumbnails from 'expo-video-thumbnails';

const CACHE_FILE_NAME = 'library-cache.json';

export type CachedVideoMeta = {
  uri: string;
  filename: string;
  sizeBytes: number;
  modificationTime: number | null;
  duration: number | null;
  thumbnailUri: string | null;
  subtitleUri: string | null;
};

export type LibraryCache = {
  folderUri: string | null;
  folderName: string | null;
  entries: Record<string, CachedVideoMeta>;
};

function cacheFile(): File {
  return new File(Paths.document, CACHE_FILE_NAME);
}

const EMPTY_CACHE: LibraryCache = { folderUri: null, folderName: null, entries: {} };

export function readLibraryCache(): LibraryCache {
  try {
    const file = cacheFile();
    if (!file.exists) {
      return { ...EMPTY_CACHE };
    }
    const parsed = JSON.parse(file.textSync());
    return {
      folderUri: typeof parsed?.folderUri === 'string' ? parsed.folderUri : null,
      folderName: typeof parsed?.folderName === 'string' ? parsed.folderName : null,
      entries: parsed?.entries && typeof parsed.entries === 'object' ? parsed.entries : {},
    };
  } catch {
    return { ...EMPTY_CACHE };
  }
}

export function writeLibraryCache(cache: LibraryCache): void {
  try {
    cacheFile().write(JSON.stringify(cache));
  } catch {
    // Best-effort persistence — a failed write just means a re-scan/re-probe next launch.
  }
}

function thumbnailsDirectory(): Directory {
  const dir = new Directory(Paths.cache, 'thumbnails');
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

export async function generateThumbnail(videoUri: string, id: string): Promise<string | null> {
  try {
    const result = await VideoThumbnails.getThumbnailAsync(videoUri, { quality: 0.5 });
    const destination = new File(thumbnailsDirectory(), `${id}.jpg`);
    if (destination.exists) {
      destination.delete();
    }
    new File(result.uri).copy(destination);
    return destination.uri;
  } catch {
    return null;
  }
}

function chapterThumbnailsDirectory(): Directory {
  const dir = new Directory(Paths.cache, 'thumbnails/chapters');
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

export async function generateChapterThumbnail(
  videoUri: string,
  videoId: string,
  chapterIndex: number,
  timeMs: number
): Promise<string | null> {
  const destination = new File(chapterThumbnailsDirectory(), `${videoId}-${chapterIndex}.jpg`);
  if (destination.exists) {
    return destination.uri;
  }
  try {
    const result = await VideoThumbnails.getThumbnailAsync(videoUri, { quality: 0.4, time: timeMs });
    new File(result.uri).copy(destination);
    return destination.uri;
  } catch {
    return null;
  }
}
