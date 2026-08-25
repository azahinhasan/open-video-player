import { NativeModule, requireNativeModule } from 'expo';

declare class MediaRenameModule extends NativeModule<Record<string, never>> {
  /**
   * Renames a MediaStore video asset. `assetId` is the asset's MediaStore row
   * id (VideoAsset.id — NOT its uri, which expo-media-library gives as a
   * "file://<path>" string rather than a content:// uri ContentResolver can
   * act on). `newDisplayName` should include the file extension.
   *
   * Requests write consent via the system dialog when the app doesn't
   * already have it. Resolves to the asset's new "file://<path>" — the OS
   * renames the underlying file to match, so the old uri goes stale and
   * callers must replace it with this one.
   */
  renameAsync(assetId: string, newDisplayName: string): Promise<string>;
}

export default requireNativeModule<MediaRenameModule>('MediaRename');
