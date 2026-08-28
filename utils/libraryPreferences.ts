import { File, Paths } from 'expo-file-system';

const PREFERENCE_FILE_NAME = 'library-preferences.json';

export type CustomScanFolder = {
  /** SAF (Storage Access Framework) tree URI — content://..., not a plain file path. */
  uri: string;
  /** Display name shown in the UI, derived from the picked folder at add-time. */
  name: string;
};

export type LibraryPreferences = {
  autoRefreshOnLaunch: boolean;
  /** Device album IDs (expo-media-library) to restrict scanning to — empty means scan the whole device, same as before this existed. */
  scanFolderIds: string[];
  /** Arbitrary folders picked via the native folder browser (see utils/safVideoScan.ts) — scanned in addition to scanFolderIds/the whole-device default, not instead of. */
  customScanFolders: CustomScanFolder[];
};

const DEFAULT_PREFERENCE: LibraryPreferences = {
  autoRefreshOnLaunch: false,
  scanFolderIds: [],
  customScanFolders: [],
};

function isCustomScanFolder(value: unknown): value is CustomScanFolder {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as CustomScanFolder).uri === 'string' &&
    typeof (value as CustomScanFolder).name === 'string'
  );
}

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
      scanFolderIds:
        Array.isArray(parsed?.scanFolderIds) && parsed.scanFolderIds.every((id: unknown) => typeof id === 'string')
          ? parsed.scanFolderIds
          : DEFAULT_PREFERENCE.scanFolderIds,
      customScanFolders:
        Array.isArray(parsed?.customScanFolders) && parsed.customScanFolders.every(isCustomScanFolder)
          ? parsed.customScanFolders
          : DEFAULT_PREFERENCE.customScanFolders,
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
