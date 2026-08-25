import MediaRename from 'media-rename';

/** Splits "My Clip.mp4" into { base: "My Clip", extension: ".mp4" }. */
export function splitFilename(filename: string): { base: string; extension: string } {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot <= 0) {
    return { base: filename, extension: '' };
  }
  return { base: filename.slice(0, lastDot), extension: filename.slice(lastDot) };
}

export type RenameResult = {
  filename: string;
  uri: string;
};

/**
 * Renames a video asset. `newBaseName` is just the name the user typed (no
 * extension) — the original extension is always preserved, regardless of
 * what they enter, so the file's type never silently changes.
 *
 * Returns the new filename and uri on success (the OS renames the
 * underlying file too, so the old uri goes stale — callers must store the
 * returned one), or null on failure (permission denied, name collision,
 * etc.) — never throws.
 */
export async function renameVideoAsync(
  assetId: string,
  currentFilename: string,
  newBaseName: string
): Promise<RenameResult | null> {
  const trimmed = newBaseName.trim();
  if (!trimmed) {
    return null;
  }
  const { extension } = splitFilename(currentFilename);
  const newFilename = `${trimmed}${extension}`;
  if (newFilename === currentFilename) {
    return null;
  }
  try {
    const newUri = await MediaRename.renameAsync(assetId, newFilename);
    return { filename: newFilename, uri: newUri };
  } catch (e) {
    console.warn('[renameVideoAsync] rename failed:', e instanceof Error ? e.message : e);
    return null;
  }
}
