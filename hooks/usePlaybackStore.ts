import { create } from 'zustand';

import type { VideoAsset } from '@/types/video';
import { readViewedVideos, writeViewedVideos, type ViewedVideos } from '@/utils/viewedVideos';
import { readWatchHistory, writeWatchHistory, type WatchHistory, type WatchHistoryEntry } from '@/utils/watchHistory';

const RESUME_THRESHOLD_SECONDS = 5;
const NEAR_END_FRACTION = 0.95;

type PlaybackState = {
  queue: VideoAsset[];
  paused: boolean;
  history: WatchHistory;
  viewed: ViewedVideos;
  setQueue: (queue: VideoAsset[]) => void;
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  savePosition: (videoId: string, seconds: number, duration: number) => void;
  clearPosition: (videoId: string) => void;
  positionFor: (videoId: string) => number;
  resumeEntryFor: (videoId: string) => WatchHistoryEntry | null;
  markViewed: (videoId: string) => void;
};

export const usePlaybackStore = create<PlaybackState>((set, get) => ({
  queue: [],
  paused: false,
  history: readWatchHistory(),
  viewed: readViewedVideos(),
  setQueue: (queue) => set({ queue, paused: false }),
  play: () => set({ paused: false }),
  pause: () => set({ paused: true }),
  togglePlayPause: () => set((s) => ({ paused: !s.paused })),
  savePosition: (videoId, seconds, duration) => {
    const finished = duration > 0 && seconds >= duration * NEAR_END_FRACTION;
    const history = { ...get().history };
    if (finished || seconds < RESUME_THRESHOLD_SECONDS) {
      delete history[videoId];
    } else {
      history[videoId] = { videoId, positionSeconds: seconds, duration, updatedAt: Date.now() };
    }
    set({ history });
    writeWatchHistory(history);
  },
  clearPosition: (videoId) => {
    const history = { ...get().history };
    delete history[videoId];
    set({ history });
    writeWatchHistory(history);
  },
  positionFor: (videoId) => get().history[videoId]?.positionSeconds ?? 0,
  resumeEntryFor: (videoId) => get().history[videoId] ?? null,
  markViewed: (videoId) => {
    if (get().viewed[videoId]) {
      return;
    }
    const viewed = { ...get().viewed, [videoId]: true as const };
    set({ viewed });
    writeViewedVideos(viewed);
  },
}));

export function adjacentVideoId(
  queue: VideoAsset[],
  currentId: string,
  offset: 1 | -1
): string | null {
  const index = queue.findIndex((video) => video.id === currentId);
  if (index === -1) {
    return null;
  }
  return queue[index + offset]?.id ?? null;
}
