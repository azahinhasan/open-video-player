import { File, Paths } from 'expo-file-system';

const PREFERENCE_FILE_NAME = 'view-mode-preference.json';

export type ViewMode = 'grid' | 'list';

const DEFAULT_VIEW_MODE: ViewMode = 'grid';

function preferenceFile(): File {
  return new File(Paths.document, PREFERENCE_FILE_NAME);
}

export function readViewMode(): ViewMode {
  try {
    const file = preferenceFile();
    if (!file.exists) {
      return DEFAULT_VIEW_MODE;
    }
    const parsed = JSON.parse(file.textSync());
    return parsed?.viewMode === 'list' ? 'list' : DEFAULT_VIEW_MODE;
  } catch {
    return DEFAULT_VIEW_MODE;
  }
}

export function writeViewMode(viewMode: ViewMode): void {
  try {
    preferenceFile().write(JSON.stringify({ viewMode }));
  } catch {
    // Best-effort persistence — a failed write just means it resets next launch.
  }
}
