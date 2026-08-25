export type Chapter = {
  index: number;
  label: string;
  startTime: number;
  endTime: number;
  startFraction: number;
  endFraction: number;
};

const TARGET_SEGMENT_SECONDS = 120;
const MIN_SEGMENTS = 4;
const MAX_SEGMENTS = 12;

export function getChapters(duration: number): Chapter[] {
  if (!Number.isFinite(duration) || duration <= 0) {
    return [];
  }

  const targetCount = Math.round(duration / TARGET_SEGMENT_SECONDS);
  const segmentCount = Math.min(MAX_SEGMENTS, Math.max(MIN_SEGMENTS, targetCount));
  const segmentDuration = duration / segmentCount;

  return Array.from({ length: segmentCount }, (_, index) => {
    const startTime = index * segmentDuration;
    const endTime = index === segmentCount - 1 ? duration : startTime + segmentDuration;
    return {
      index,
      label: `Chapter ${index + 1}`,
      startTime,
      endTime,
      startFraction: startTime / duration,
      endFraction: endTime / duration,
    };
  });
}
