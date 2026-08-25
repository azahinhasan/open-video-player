import { useCallback, useEffect, useRef, useState } from 'react';
import { Directory, File } from 'expo-file-system';

import type { VideoAsset } from '@/types/video';
import { hashString, isVideoExtension } from '@/utils/videoExtensions';
import { readLibraryCache, writeLibraryCache, type LibraryCache } from '@/utils/thumbnailCache';

export type LibraryStatus = 'idle' | 'scanning' | 'ready' | 'error';

const YIELD_EVERY = 25;
const SUBTITLE_EXTENSIONS = new Set(['.srt', '.vtt']);

function basenameWithoutExtension(name: string, extension: string): string {
  return name.slice(0, name.length - extension.length).toLowerCase();
}

function videosFromCache(cache: LibraryCache): VideoAsset[] {
  return Object.entries(cache.entries)
    // Guards against a cache written by an older version of the app, before
    // `uri` was stored per-entry — those entries can't be reconstructed, so
    // skip them rather than showing an unplayable tile. A background rescan
    // rewrites the cache in the current shape right after.
    .filter((entry): entry is [string, LibraryCache['entries'][string]] => {
      const meta = entry[1];
      return typeof meta?.uri === 'string' && meta.uri.length > 0;
    })
    .map(([id, meta]) => ({
      id,
      uri: meta.uri,
      filename: meta.filename,
      sizeBytes: meta.sizeBytes,
      modificationTime: meta.modificationTime,
      duration: meta.duration,
      thumbnailUri: meta.thumbnailUri,
      subtitleUri: meta.subtitleUri ?? null,
    }))
    .sort((a, b) => a.filename.localeCompare(b.filename));
}

async function walk(directory: Directory, out: VideoAsset[], depth = 0): Promise<void> {
  if (depth > 12) {
    return;
  }

  let children: (Directory | File)[];
  try {
    children = directory.list();
  } catch {
    return;
  }

  const subtitlesByBasename = new Map<string, string>();
  for (const child of children) {
    if (!(child instanceof File)) {
      continue;
    }
    try {
      const extension = child.extension.toLowerCase();
      if (SUBTITLE_EXTENSIONS.has(extension)) {
        subtitlesByBasename.set(basenameWithoutExtension(child.name, extension), child.uri);
      }
    } catch {
      // Unreadable entry — just won't be matched as a subtitle.
    }
  }

  for (const child of children) {
    if (child instanceof Directory) {
      await walk(child, out, depth + 1);
      continue;
    }

    try {
      const extension = child.extension.toLowerCase();
      if (!isVideoExtension(extension)) {
        continue;
      }
      out.push({
        id: hashString(child.uri),
        uri: child.uri,
        filename: child.name,
        sizeBytes: child.size,
        modificationTime: child.modificationTime,
        duration: null,
        thumbnailUri: null,
        subtitleUri: subtitlesByBasename.get(basenameWithoutExtension(child.name, extension)) ?? null,
      });
      if (out.length % YIELD_EVERY === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    } catch {
      // Unreadable entry (permission revoked mid-scan, etc.) — skip it.
    }
  }
}

export function useVideoLibrary() {
  const initialCache = useRef<LibraryCache | null>(null);
  const initialVideos = useRef<VideoAsset[] | null>(null);
  if (initialCache.current === null) {
    initialCache.current = readLibraryCache();
    initialVideos.current = videosFromCache(initialCache.current);
  }
  const hasCachedVideos = initialVideos.current!.length > 0;

  const [folderUri, setFolderUri] = useState<string | null>(initialCache.current.folderUri);
  const [folderName, setFolderName] = useState<string | null>(initialCache.current.folderName);
  const [videos, setVideos] = useState<VideoAsset[]>(initialVideos.current!);
  // If we already have cached videos to show instantly, the background refresh
  // that follows shouldn't blank the screen with a full-page spinner.
  const [status, setStatus] = useState<LibraryStatus>(hasCachedVideos ? 'ready' : 'idle');
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<LibraryCache>(initialCache.current);
  const restoredRef = useRef(false);

  const scanFolder = useCallback(async (uri: string, opts?: { silent?: boolean }) => {
    setStatus('scanning');
    setError(null);
    try {
      const root = new Directory(uri);
      if (!root.exists) {
        throw new Error('This folder is no longer accessible. Choose it again.');
      }

      const found: VideoAsset[] = [];
      await walk(root, found);

      const cache = cacheRef.current;
      const merged = found
        .map((video) => {
          const cached = cache.entries[video.id];
          return cached
            ? { ...video, duration: cached.duration, thumbnailUri: cached.thumbnailUri }
            : video;
        })
        .sort((a, b) => a.filename.localeCompare(b.filename));

      const nextEntries: LibraryCache['entries'] = {};
      for (const video of merged) {
        nextEntries[video.id] = {
          uri: video.uri,
          filename: video.filename,
          sizeBytes: video.sizeBytes,
          modificationTime: video.modificationTime,
          duration: video.duration,
          thumbnailUri: video.thumbnailUri,
          subtitleUri: video.subtitleUri,
        };
      }
      cacheRef.current = { folderUri: uri, folderName: root.name, entries: nextEntries };
      writeLibraryCache(cacheRef.current);

      setVideos(merged);
      setFolderUri(uri);
      setFolderName(root.name);
      setStatus('ready');
    } catch (e) {
      if (opts?.silent) {
        // Restoring the last folder on launch failed (e.g. permission was revoked) —
        // fall back to whatever was already showing instead of a scary error.
        setStatus(hasCachedVideos ? 'ready' : 'idle');
        return;
      }
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Could not scan this folder.');
      throw e;
    }
  }, [hasCachedVideos]);

  useEffect(() => {
    if (restoredRef.current) {
      return;
    }
    restoredRef.current = true;
    const lastFolderUri = cacheRef.current.folderUri;
    if (lastFolderUri) {
      // The cached list (if any) is already showing — this just reconciles it
      // with what's actually on disk (new/removed/renamed files) in the background.
      scanFolder(lastFolderUri, { silent: true }).catch(() => {});
    }
  }, [scanFolder]);

  const pickFolder = useCallback(async () => {
    const dir = await Directory.pickDirectoryAsync();
    await scanFolder(dir.uri);
  }, [scanFolder]);

  const rescan = useCallback(() => {
    if (folderUri) {
      return scanFolder(folderUri);
    }
    return Promise.resolve();
  }, [folderUri, scanFolder]);

  const updateVideoMeta = useCallback(
    (id: string, patch: Partial<Pick<VideoAsset, 'duration' | 'thumbnailUri'>>) => {
      setVideos((prev) => prev.map((video) => (video.id === id ? { ...video, ...patch } : video)));

      const cache = cacheRef.current;
      const existing = cache.entries[id];
      if (existing) {
        cache.entries[id] = { ...existing, ...patch };
        writeLibraryCache(cache);
      }
    },
    []
  );

  return {
    folderUri,
    folderName,
    videos,
    status,
    error,
    pickFolder,
    rescan,
    updateVideoMeta,
  };
}
