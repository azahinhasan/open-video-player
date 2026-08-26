export type SubtitleCue = {
  start: number;
  end: number;
  text: string;
};

const TIMING_LINE_RE =
  /(\d{1,2}:)?(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(\d{1,2}:)?(\d{2}):(\d{2})[.,](\d{3})/;
const TAG_RE = /<[^>]+>/g;

function parseTimestamp(hours: string | undefined, minutes: string, seconds: string, millis: string): number {
  const h = hours ? parseInt(hours, 10) : 0;
  const m = parseInt(minutes, 10);
  const s = parseInt(seconds, 10);
  const ms = parseInt(millis, 10);
  return h * 3600 + m * 60 + s + ms / 1000;
}

function stripTags(text: string): string {
  return text.replace(TAG_RE, '').trim();
}

/**
 * Parses SRT or WebVTT subtitle text into timed cues — the same logic
 * handles both formats since it locates the `-->` timing line inside each
 * blank-line-separated block rather than assuming a fixed line layout, so
 * SRT's leading index lines and VTT's WEBVTT/NOTE/STYLE header blocks (which
 * never contain a timing line) are naturally skipped rather than needing
 * format-specific branches. Tolerant of optional hours and VTT's trailing
 * cue-settings like `align:start position:10%`. Never throws — malformed
 * input just yields no cues.
 */
export function parseSubtitles(content: string): SubtitleCue[] {
  try {
    const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const blocks = normalized.split(/\n\s*\n/);
    const cues: SubtitleCue[] = [];

    for (const block of blocks) {
      const lines = block.split('\n');
      const timingIndex = lines.findIndex((line) => TIMING_LINE_RE.test(line));
      if (timingIndex === -1) {
        continue;
      }
      const match = lines[timingIndex].match(TIMING_LINE_RE);
      if (!match) {
        continue;
      }
      const start = parseTimestamp(match[1], match[2], match[3], match[4]);
      const end = parseTimestamp(match[5], match[6], match[7], match[8]);
      const text = stripTags(lines.slice(timingIndex + 1).join('\n'));
      if (text.length === 0 || end <= start) {
        continue;
      }
      cues.push({ start, end, text });
    }

    cues.sort((a, b) => a.start - b.start);
    return cues;
  } catch {
    return [];
  }
}
