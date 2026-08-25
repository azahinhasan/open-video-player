import { Directory, File, Paths } from 'expo-file-system';
import * as VideoThumbnails from 'expo-video-thumbnails';

function thumbnailsDirectory(): Directory {
  const dir = new Directory(Paths.cache, 'thumbnails');
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

export async function generateThumbnail(videoUri: string, id: string): Promise<string | null> {
  const destination = new File(thumbnailsDirectory(), `${id}.jpg`);
  if (destination.exists) {
    return destination.uri;
  }
  try {
    const result = await VideoThumbnails.getThumbnailAsync(videoUri, { quality: 0.5 });
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
