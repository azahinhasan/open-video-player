import { File, Paths } from 'expo-file-system';

const PREFERENCE_FILE_NAME = 'sort-preference.json';

export type SortMode = 'name' | 'date' | 'duration';

const VALID_MODES: SortMode[] = ['name', 'date', 'duration'];
const DEFAULT_MODE: SortMode = 'name';

function preferenceFile(): File {
  return new File(Paths.document, PREFERENCE_FILE_NAME);
}

export function readSortPreference(): SortMode {
  try {
    const file = preferenceFile();
    if (!file.exists) {
      return DEFAULT_MODE;
    }
    const parsed = JSON.parse(file.textSync());
    return VALID_MODES.includes(parsed?.sortMode) ? parsed.sortMode : DEFAULT_MODE;
  } catch {
    return DEFAULT_MODE;
  }
}

export function writeSortPreference(sortMode: SortMode): void {
  try {
    preferenceFile().write(JSON.stringify({ sortMode }));
  } catch {
    // Best-effort persistence — a failed write just means it resets next launch.
  }
}
