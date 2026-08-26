import { File, Paths } from 'expo-file-system';

const OVERRIDES_FILE_NAME = 'subtitle-overrides.json';

/** Maps videoId -> a manually-picked subtitle file's uri (copied into app storage, see PlayerScreen). */
export type SubtitleOverrides = Record<string, string>;

function overridesFile(): File {
  return new File(Paths.document, OVERRIDES_FILE_NAME);
}

export function readSubtitleOverrides(): SubtitleOverrides {
  try {
    const file = overridesFile();
    if (!file.exists) {
      return {};
    }
    const parsed = JSON.parse(file.textSync());
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function writeSubtitleOverrides(overrides: SubtitleOverrides): void {
  try {
    overridesFile().write(JSON.stringify(overrides));
  } catch {
    // Best-effort persistence — a failed write just means the override resets next launch.
  }
}
