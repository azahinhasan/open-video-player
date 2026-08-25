import { File, Paths } from 'expo-file-system';

const VIEWED_FILE_NAME = 'viewed-videos.json';

export type ViewedVideos = Record<string, true>;

function viewedFile(): File {
  return new File(Paths.document, VIEWED_FILE_NAME);
}

export function readViewedVideos(): ViewedVideos {
  try {
    const file = viewedFile();
    if (!file.exists) {
      return {};
    }
    const parsed = JSON.parse(file.textSync());
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function writeViewedVideos(viewed: ViewedVideos): void {
  try {
    viewedFile().write(JSON.stringify(viewed));
  } catch {
    // Best-effort persistence — a failed write just means the NEW badge may reappear.
  }
}
