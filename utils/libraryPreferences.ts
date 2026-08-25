import { File, Paths } from 'expo-file-system';

const PREFERENCE_FILE_NAME = 'library-preferences.json';

export type LibraryPreferences = {
  autoRefreshOnLaunch: boolean;
};

const DEFAULT_PREFERENCE: LibraryPreferences = { autoRefreshOnLaunch: false };

function preferenceFile(): File {
  return new File(Paths.document, PREFERENCE_FILE_NAME);
}

export function readLibraryPreferences(): LibraryPreferences {
  try {
    const file = preferenceFile();
    if (!file.exists) {
      return { ...DEFAULT_PREFERENCE };
    }
    const parsed = JSON.parse(file.textSync());
    return {
      autoRefreshOnLaunch:
        typeof parsed?.autoRefreshOnLaunch === 'boolean'
          ? parsed.autoRefreshOnLaunch
          : DEFAULT_PREFERENCE.autoRefreshOnLaunch,
    };
  } catch {
    return { ...DEFAULT_PREFERENCE };
  }
}

export function writeLibraryPreferences(preference: LibraryPreferences): void {
  try {
    preferenceFile().write(JSON.stringify(preference));
  } catch {
    // Best-effort persistence — a failed write just means the choice resets next launch.
  }
}
