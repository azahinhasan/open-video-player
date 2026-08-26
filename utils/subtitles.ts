import { File } from 'expo-file-system';

import type { VideoAsset } from '@/types/video';
import { splitFilename } from '@/utils/renameVideo';
import { parseSubtitles, type SubtitleCue } from '@/utils/subtitleParser';

const SUBTITLE_EXTENSIONS = ['.srt', '.vtt'];

export function isSubtitleFilename(filename: string): boolean {
  const lower = filename.toLowerCase();
  return SUBTITLE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Looks for a same-basename .srt/.vtt file next to the video (e.g.
 * "Movie.mp4" alongside "Movie.srt"). Sync — just a couple of
 * file-existence checks, cheap enough to redo every time the player opens a
 * video rather than caching the result.
 */
export function findSidecarSubtitle(video: VideoAsset): string | null {
  try {
    const videoFile = new File(video.uri);
    const dir = videoFile.parentDirectory;
    const { base } = splitFilename(video.filename);
    for (const ext of SUBTITLE_EXTENSIONS) {
      const candidate = new File(dir, `${base}${ext}`);
      if (candidate.exists) {
        return candidate.uri;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function loadSubtitleCues(uri: string): Promise<SubtitleCue[]> {
  try {
    const content = await new File(uri).text();
    return parseSubtitles(content);
  } catch {
    return [];
  }
}
