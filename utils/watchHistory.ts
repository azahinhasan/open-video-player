import { File, Paths } from 'expo-file-system';

const HISTORY_FILE_NAME = 'watch-history.json';

export type WatchHistoryEntry = {
  videoId: string;
  positionSeconds: number;
  duration: number;
  updatedAt: number;
};

export type WatchHistory = Record<string, WatchHistoryEntry>;

function historyFile(): File {
  return new File(Paths.document, HISTORY_FILE_NAME);
}

export function readWatchHistory(): WatchHistory {
  try {
    const file = historyFile();
    if (!file.exists) {
      return {};
    }
    const parsed = JSON.parse(file.textSync());
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function writeWatchHistory(history: WatchHistory): void {
  try {
    historyFile().write(JSON.stringify(history));
  } catch {
    // Best-effort persistence — a failed write just means no resume prompt next launch.
  }
}
