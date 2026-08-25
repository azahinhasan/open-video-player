import { useCallback, useEffect, useMemo } from 'react';
import * as MediaLibrary from 'expo-media-library';
import { create } from 'zustand';

import type { VideoAsset, VideoFolder } from '@/types/video';
import { useLibraryPreferences } from '@/hooks/useLibraryPreferences';
import { readMediaCache, writeMediaCache } from '@/utils/mediaCache';

export type LibraryStatus =
  | 'checking-permission'
  | 'needs-permission'
  | 'denied'
  | 'scanning'
  | 'ready'
  | 'error';

const PAGE_SIZE = 500;
const UNKNOWN_FOLDER_ID = 'unknown';
const UNKNOWN_FOLDER_NAME = 'Videos';

async function fetchAllVideoAssets(): Promise<MediaLibrary.Asset[]> {
  const assets: MediaLibrary.Asset[] = [];
  let after: string | undefined;
  for (;;) {
    const page = await MediaLibrary.getAssetsAsync({
      mediaType: 'video',
      first: PAGE_SIZE,
      after,
      sortBy: [['modificationTime', false]],
    });
    assets.push(...page.assets);
    if (!page.hasNextPage || !page.endCursor) {
      break;
    }
    after = page.endCursor;
  }
  return assets;
}

function buildVideos(assets: MediaLibrary.Asset[]): VideoAsset[] {
  return assets.map((asset) => ({
    id: asset.id,
    uri: asset.uri,
    filename: asset.filename,
    modificationTime: asset.modificationTime ?? null,
    creationTime: asset.creationTime ?? null,
    duration: asset.duration || null,
    width: asset.width,
    height: asset.height,
    thumbnailUri: null,
    subtitleUri: null,
    folderId: asset.albumId || UNKNOWN_FOLDER_ID,
  }));
}

function buildFolders(videos: VideoAsset[], folderNames: Record<string, string>): VideoFolder[] {
  const byFolder = new Map<string, { count: number; latest: VideoAsset }>();
  for (const video of videos) {
    const existing = byFolder.get(video.folderId);
    if (!existing) {
      byFolder.set(video.folderId, { count: 1, latest: video });
      continue;
    }
    existing.count += 1;
    if ((video.modificationTime ?? 0) > (existing.latest.modificationTime ?? 0)) {
      existing.latest = video;
    }
  }

  return Array.from(byFolder.entries())
    .map(([id, { count, latest }]) => ({
      id,
      name: folderNames[id] ?? UNKNOWN_FOLDER_NAME,
      videoCount: count,
      thumbnailUri: latest.thumbnailUri,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

type VideoLibraryStoreState = {
  videos: VideoAsset[];
  folderNames: Record<string, string>;
  status: LibraryStatus;
  error: string | null;
  canAskAgain: boolean;
  initialized: boolean;
  init: () => void;
  requestAccess: () => Promise<void>;
  rescan: () => Promise<void>;
  updateVideoMeta: (id: string, patch: Partial<Pick<VideoAsset, 'duration' | 'thumbnailUri'>>) => void;
  deleteVideos: (ids: string[]) => Promise<boolean>;
};

const useVideoLibraryStore = create<VideoLibraryStoreState>((set, get) => ({
  videos: [],
  folderNames: {},
  status: 'checking-permission',
  error: null,
  canAskAgain: true,
  initialized: false,

  init: () => {
    if (get().initialized) {
      return;
    }
    set({ initialized: true });
    (async () => {
      const [cache, existing] = await Promise.all([
        readMediaCache(),
        MediaLibrary.getPermissionsAsync(false, ['video']),
      ]);
      set({ canAskAgain: existing.canAskAgain, videos: cache.videos, folderNames: cache.folderNames });

      if (!(existing.granted || existing.accessPrivileges === 'limited')) {
        set({ status: 'needs-permission' });
        return;
      }
      // Skip the automatic launch scan when the user has disabled it and we
      // already have cached videos to show — an empty cache still needs a
      // scan regardless, otherwise there'd be nothing on screen to pull-to-refresh.
      const shouldAutoScan = useLibraryPreferences.getState().autoRefreshOnLaunch || cache.videos.length === 0;
      if (shouldAutoScan) {
        await get().rescan();
      } else {
        set({ status: 'ready' });
      }
    })();
  },

  requestAccess: async () => {
    const response = await MediaLibrary.requestPermissionsAsync(false, ['video']);
    set({ canAskAgain: response.canAskAgain });
    if (response.granted || response.accessPrivileges === 'limited') {
      await get().rescan();
    } else {
      set({ status: 'denied' });
    }
  },

  rescan: async () => {
    set({ status: 'scanning', error: null });
    try {
      const [assets, albums] = await Promise.all([
        fetchAllVideoAssets(),
        MediaLibrary.getAlbumsAsync({ includeSmartAlbums: true }),
      ]);
      const nextFolderNames: Record<string, string> = {};
      for (const album of albums) {
        nextFolderNames[album.id] = album.title;
      }

      const thumbnailById = new Map(get().videos.map((v) => [v.id, v.thumbnailUri]));
      const nextVideos = buildVideos(assets).map((video) => ({
        ...video,
        thumbnailUri: thumbnailById.get(video.id) ?? null,
      }));

      writeMediaCache({ videos: nextVideos, folderNames: nextFolderNames });
      set({ videos: nextVideos, folderNames: nextFolderNames, status: 'ready' });
    } catch (e) {
      set({
        status: get().videos.length > 0 ? 'ready' : 'error',
        error: e instanceof Error ? e.message : 'Could not scan your device for videos.',
      });
    }
  },

  updateVideoMeta: (id, patch) => {
    const videos = get().videos.map((v) => (v.id === id ? { ...v, ...patch } : v));
    set({ videos });
    writeMediaCache({ videos, folderNames: get().folderNames });
  },

  deleteVideos: async (ids) => {
    if (ids.length === 0) {
      return true;
    }
    try {
      const deleted = await MediaLibrary.deleteAssetsAsync(ids);
      if (!deleted) {
        return false;
      }
      const idSet = new Set(ids);
      const videos = get().videos.filter((v) => !idSet.has(v.id));
      set({ videos });
      writeMediaCache({ videos, folderNames: get().folderNames });
      return true;
    } catch {
      return false;
    }
  },
}));

export function useVideoLibrary() {
  const videos = useVideoLibraryStore((s) => s.videos);
  const folderNames = useVideoLibraryStore((s) => s.folderNames);
  const status = useVideoLibraryStore((s) => s.status);
  const error = useVideoLibraryStore((s) => s.error);
  const canAskAgain = useVideoLibraryStore((s) => s.canAskAgain);
  const init = useVideoLibraryStore((s) => s.init);
  const requestAccess = useVideoLibraryStore((s) => s.requestAccess);
  const rescan = useVideoLibraryStore((s) => s.rescan);
  const updateVideoMeta = useVideoLibraryStore((s) => s.updateVideoMeta);
  const deleteVideos = useVideoLibraryStore((s) => s.deleteVideos);

  useEffect(() => {
    init();
  }, [init]);

  const folders = useMemo(() => buildFolders(videos, folderNames), [videos, folderNames]);
  const videosForFolder = useCallback(
    (folderId: string) => videos.filter((video) => video.folderId === folderId),
    [videos]
  );

  return {
    videos,
    folders,
    videosForFolder,
    status,
    error,
    canAskAgain,
    requestAccess,
    rescan,
    updateVideoMeta,
    deleteVideos,
  };
}
