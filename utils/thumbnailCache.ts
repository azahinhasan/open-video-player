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

function seekPreviewThumbnailsDirectory(): Directory {
  const dir = new Directory(Paths.cache, 'thumbnails/seek-preview');
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

/**
 * Thumbnail for the seek bar's drag-preview bubble. `bucketIndex` divides
 * the video into SeekBar's PREVIEW_BUCKETS equal slices purely so nearby
 * drag positions reuse the same cached frame instead of regenerating one on
 * every pixel of movement — it doesn't correspond to anything shown in the UI.
 */
export async function generateSeekPreviewThumbnail(
  videoUri: string,
  videoId: string,
  bucketIndex: number,
  timeMs: number
): Promise<string | null> {
  const destination = new File(seekPreviewThumbnailsDirectory(), `${videoId}-${bucketIndex}.jpg`);
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
