package expo.modules.mediarename

import android.content.ContentUris
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Binder
import android.os.Build
import android.provider.MediaStore
import expo.modules.kotlin.activityresult.AppContextActivityResultLauncher
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class RenamePermissionDeniedException :
  CodedException("User did not grant permission to rename this file")

class RenameFailedException(message: String) : CodedException(message)

class MediaRenameModule : Module() {
  private lateinit var writeLauncher: AppContextActivityResultLauncher<WriteContractInput, Boolean>

  private val context: Context
    get() = appContext.reactContext ?: throw CodedException("React context is not available")

  override fun definition() = ModuleDefinition {
    Name("MediaRename")

    RegisterActivityContracts {
      writeLauncher = registerForActivityResult(WriteContract(this@MediaRenameModule))
    }

    // Takes the MediaStore row id (VideoAsset.id from expo-media-library), not a
    // uri — expo-media-library's own `uri` field is a "file://<path>" string, not
    // a content:// uri, so it can't be handed to ContentResolver directly. Resolves
    // to the asset's new "file://<path>" (the OS actually renames the underlying
    // file to match, so the old file:// uri goes stale — callers must update it).
    AsyncFunction("renameAsync") Coroutine { assetId: String, newDisplayName: String ->
      return@Coroutine renameAsset(assetId, newDisplayName)
    }
  }

  private suspend fun renameAsset(assetId: String, newDisplayName: String): String {
    val id = assetId.toLongOrNull() ?: throw RenameFailedException("Invalid asset id: $assetId")
    val uri = ContentUris.withAppendedId(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, id)

    ensureWritePermission(uri)

    val values = ContentValues().apply {
      put(MediaStore.MediaColumns.DISPLAY_NAME, newDisplayName)
    }
    val rows = try {
      context.contentResolver.update(uri, values, null, null)
    } catch (e: Exception) {
      throw RenameFailedException(e.message ?: "Failed to rename file")
    }
    if (rows <= 0) {
      throw RenameFailedException("No file was updated — it may have been moved or deleted")
    }

    return queryFileUri(uri)
      ?: throw RenameFailedException("Renamed, but could not resolve the new file path")
  }

  private fun queryFileUri(uri: Uri): String? {
    context.contentResolver.query(uri, arrayOf(MediaStore.MediaColumns.DATA), null, null, null)?.use { cursor ->
      if (cursor.moveToFirst()) {
        val path = cursor.getString(0)
        if (!path.isNullOrEmpty()) {
          return "file://$path"
        }
      }
    }
    return null
  }

  /**
   * Below Android 11 there's no write-request flow to proactively check —
   * the direct update below either succeeds (this app inserted the asset, or
   * the OS still grants legacy write access) or throws, same as
   * expo-media-library's own handling only bothers with the API 30+ path.
   */
  private suspend fun ensureWritePermission(uri: Uri) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
      return
    }
    if (hasWritePermissionForUri(uri)) {
      return
    }
    val granted = writeLauncher.launch(WriteContractInput(uris = listOf(uri)))
    if (!granted) {
      throw RenamePermissionDeniedException()
    }
  }

  private fun hasWritePermissionForUri(uri: Uri): Boolean {
    return context.checkUriPermission(
      uri,
      Binder.getCallingPid(),
      Binder.getCallingUid(),
      Intent.FLAG_GRANT_WRITE_URI_PERMISSION
    ) == PackageManager.PERMISSION_GRANTED
  }
}
