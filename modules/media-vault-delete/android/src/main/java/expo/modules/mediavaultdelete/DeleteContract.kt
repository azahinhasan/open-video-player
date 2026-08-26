package expo.modules.mediavaultdelete

import android.app.Activity
import android.content.ContentResolver
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import androidx.activity.result.IntentSenderRequest
import androidx.activity.result.contract.ActivityResultContracts.StartIntentSenderForResult.Companion.ACTION_INTENT_SENDER_REQUEST
import androidx.activity.result.contract.ActivityResultContracts.StartIntentSenderForResult.Companion.EXTRA_INTENT_SENDER_REQUEST
import androidx.annotation.RequiresApi
import expo.modules.kotlin.activityresult.AppContextActivityResultContract
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.providers.AppContextProvider
import java.io.Serializable

/**
 * Launches the system consent dialog from `MediaStore.createDeleteRequest`,
 * covering every uri in the batch with a single dialog. Unlike a write
 * request, approving this dialog has the system perform the deletion
 * itself — there's no follow-up contentResolver.delete() call needed.
 * Mirrors modules/media-rename's WriteContract — same IntentSender
 * mechanism, different MediaStore request type.
 */
class DeleteContract(
  private val appContextProvider: AppContextProvider
) : AppContextActivityResultContract<DeleteContractInput, Boolean> {
  private val contentResolver: ContentResolver
    get() = appContextProvider.appContext.reactContext?.contentResolver
      ?: throw Exceptions.ReactContextLost()

  @RequiresApi(Build.VERSION_CODES.R)
  override fun createIntent(context: Context, input: DeleteContractInput): Intent {
    val request = MediaStore.createDeleteRequest(contentResolver, input.uris)
    val intentSenderRequest = IntentSenderRequest.Builder(request.intentSender).build()
    return Intent(ACTION_INTENT_SENDER_REQUEST).putExtra(EXTRA_INTENT_SENDER_REQUEST, intentSenderRequest)
  }

  override fun parseResult(input: DeleteContractInput, resultCode: Int, intent: Intent?): Boolean {
    return resultCode == Activity.RESULT_OK
  }
}

data class DeleteContractInput(val uris: List<Uri>) : Serializable
