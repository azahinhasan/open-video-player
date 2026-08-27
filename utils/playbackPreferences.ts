import { File, Paths } from 'expo-file-system';

const PREFERENCE_FILE_NAME = 'playback-preference.json';

export type ResumeBehavior = 'resume' | 'restart';

/** Where the transport buttons (prev/skip/play-pause/skip/next) render on the player screen. */
export type ControlsLayout = 'center' | 'bottom';

/** Orientation the player screen locks into when a video is first opened (see PlayerScreen). */
export type DefaultOrientation = 'portrait' | 'landscape';

export type PlaybackPreferences = {
  resumeBehavior: ResumeBehavior;
  autoPlayNext: boolean;
  controlsLayout: ControlsLayout;
  defaultOrientation: DefaultOrientation;
};

const DEFAULT_PREFERENCES: PlaybackPreferences = {
  resumeBehavior: 'resume',
  autoPlayNext: true,
  controlsLayout: 'center',
  defaultOrientation: 'portrait',
};

function preferenceFile(): File {
  return new File(Paths.document, PREFERENCE_FILE_NAME);
}

export function readPlaybackPreferences(): PlaybackPreferences {
  try {
    const file = preferenceFile();
    if (!file.exists) {
      return { ...DEFAULT_PREFERENCES };
    }
    const parsed = JSON.parse(file.textSync());
    return {
      resumeBehavior: parsed?.resumeBehavior === 'restart' ? 'restart' : 'resume',
      autoPlayNext: typeof parsed?.autoPlayNext === 'boolean' ? parsed.autoPlayNext : true,
      controlsLayout: parsed?.controlsLayout === 'bottom' ? 'bottom' : 'center',
      defaultOrientation: parsed?.defaultOrientation === 'landscape' ? 'landscape' : 'portrait',
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function writePlaybackPreferences(preferences: PlaybackPreferences): void {
  try {
    preferenceFile().write(JSON.stringify(preferences));
  } catch {
    // Best-effort persistence — a failed write just means it resets next launch.
  }
}
