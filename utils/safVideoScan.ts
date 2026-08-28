import { StorageAccessFramework } from 'expo-file-system/legacy';

import type { CustomScanFolder } from '@/utils/libraryPreferences';
import type { VideoAsset } from '@/types/video';

const VIDEO_EXTENSIONS = new Set([
  'mp4',
  'mkv',
  'avi',
  'mov',
  'webm',
  'm4v',
  '3gp',
  '3gpp',
  'wmv',
  'flv',
  'ts',
  'mpg',
  'mpeg',
  'ogv',
]);

/** Prefixes a custom folder's own URI so it can't collide with a real expo-media-library album id (see useVideoLibrary's buildFolders). */
export function customFolderId(folderUri: string): string {
  return `custom:${folderUri}`;
}

// SAF document URIs are opaque content:// values with no direct "get display
// name" call in this API — the encoded final path segment (after the last
// `/`, post-decode) is the file/folder name for the standard
// ExternalStorageProvider Android uses for local folders, which is what
// requestDirectoryPermissionsAsync's picker returns for. Other document
// providers (cloud-backed ones especially) aren't guaranteed to follow this
// shape, so this is a best-effort heuristic, not a guarantee.
export function displayNameFromUri(uri: string): string {
  try {
    const decoded = decodeURIComponent(uri);
    const lastSegment = decoded.split('/').pop();
    return lastSegment || uri;
  } catch {
    return uri;
  }
}

function isVideoFileName(name: string): boolean {
  const dot = name.lastIndexOf('.');
  if (dot === -1 || dot === name.length - 1) {
    return false;
  }
  return VIDEO_EXTENSIONS.has(name.slice(dot + 1).toLowerCase());
}

// There's no direct "is this a file or a directory" check that works for
// SAF content:// URIs in this API (expo-file-system's own getInfoAsync
// always reports isDirectory: false for content:// input, confirmed against
// its Android implementation) — attempting to list a URI's children is the
// only reliable signal actually exposed: it succeeds for a directory and
// throws for a file. Every URI in the returned tree is either recursed into
// (directories) or collected as a leaf (files), so directories themselves
// never appear in the output.
async function collectFileUris(uri: string): Promise<string[]> {
  try {
    const children = await StorageAccessFramework.readDirectoryAsync(uri);
    const nested = await Promise.all(children.map(collectFileUris));
    return nested.flat();
  } catch {
    return [uri];
  }
}

/**
 * Recursively scans a user-picked SAF folder (see the "Scan folders"
 * setting's "Add custom folder" flow) for video files, including
 * subfolders. Unlike expo-media-library assets, these don't come with
 * duration/dimensions/thumbnails already extracted — those stay
 * null/unknown until the video is actually opened.
 */
export async function scanCustomFolder(folder: CustomScanFolder): Promise<VideoAsset[]> {
  const fileUris = await collectFileUris(folder.uri);
  const folderId = customFolderId(folder.uri);
  const videos: VideoAsset[] = [];
  for (const uri of fileUris) {
    const filename = displayNameFromUri(uri);
    if (!isVideoFileName(filename)) {
      continue;
    }
    videos.push({
      id: uri,
      uri,
      filename,
      modificationTime: null,
      creationTime: null,
      duration: null,
      width: 0,
      height: 0,
      thumbnailUri: null,
      folderId,
    });
  }
  return videos;
}
