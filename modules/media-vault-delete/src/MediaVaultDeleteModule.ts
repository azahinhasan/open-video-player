import { NativeModule, requireNativeModule } from 'expo';

declare class MediaVaultDeleteModule extends NativeModule<Record<string, never>> {
  /**
   * Deletes MediaStore video assets by row id (VideoAsset.id from
   * expo-media-library — not a uri). Shows the Android system
   * delete-consent dialog exactly once, covering every id in the batch;
   * the system performs the deletion itself once approved. Resolves false
   * if the user declined the dialog — only throws for a genuinely invalid
   * input (e.g. a malformed asset id), never for a plain decline.
   */
  deleteAssetsAsync(assetIds: string[]): Promise<boolean>;
}

export default requireNativeModule<MediaVaultDeleteModule>('MediaVaultDelete');
