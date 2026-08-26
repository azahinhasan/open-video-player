package expo.modules.mediavaultdelete

import android.content.ContentUris
import android.provider.MediaStore
import expo.modules.kotlin.activityresult.AppContextActivityResultLauncher
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class InvalidAssetIdException(id: String) : CodedException("Invalid asset id: $id")

class MediaVaultDeleteModule : Module() {
  private lateinit var deleteLauncher: AppContextActivityResultLauncher<DeleteContractInput, Boolean>

  override fun definition() = ModuleDefinition {
    Name("MediaVaultDelete")

    RegisterActivityContracts {
      deleteLauncher = registerForActivityResult(DeleteContract(this@MediaVaultDeleteModule))
    }

    // assetIds are MediaStore row ids (VideoAsset.id from expo-media-library),
    // not uris. Shows exactly ONE system consent dialog covering every id in
    // the batch; once approved the system performs the deletion itself, so
    // there's nothing further to do here on success. Resolves false if the
    // user declined — callers treat that the same as expo-media-library's
    // own deleteAssetsAsync returning false: nothing was deleted, roll back.
    AsyncFunction("deleteAssetsAsync") Coroutine { assetIds: List<String> ->
      return@Coroutine deleteAssets(assetIds)
    }
  }

  private suspend fun deleteAssets(assetIds: List<String>): Boolean {
    if (assetIds.isEmpty()) {
      return true
    }
    val uris = assetIds.map { idString ->
      val id = idString.toLongOrNull() ?: throw InvalidAssetIdException(idString)
      ContentUris.withAppendedId(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, id)
    }
    return deleteLauncher.launch(DeleteContractInput(uris = uris))
  }
}
