import type { AudioTrack } from 'react-native-video';

// Common ISO 639-1/639-2 codes, covering the vast majority of real-world
// multi-audio files (dubbed anime/TV in particular). Falls back to the raw
// code for anything not listed rather than guessing.
const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  ja: 'Japanese',
  jpn: 'Japanese',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  ko: 'Korean',
  kor: 'Korean',
  zh: 'Chinese',
  zho: 'Chinese',
  cmn: 'Mandarin',
  pt: 'Portuguese',
  it: 'Italian',
  ru: 'Russian',
  ar: 'Arabic',
  hi: 'Hindi',
};

/** A human-readable label for an audio track — its own title, else a friendly language name, else "Track N". */
export function audioTrackLabel(track: AudioTrack, index: number): string {
  if (track.title) {
    return track.title;
  }
  if (track.language) {
    const code = track.language.toLowerCase().split('-')[0];
    return LANGUAGE_NAMES[code] ?? track.language;
  }
  return `Track ${index + 1}`;
}
