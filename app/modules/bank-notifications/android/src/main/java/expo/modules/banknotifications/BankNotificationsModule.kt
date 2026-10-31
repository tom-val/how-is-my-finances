package expo.modules.banknotifications

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class BankNotificationsModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("BankNotifications")

    Function("isSupported") { true }

    /** Whether the user has granted Finansai notification access in system settings. */
    Function("isPermissionGranted") {
      NotificationManagerCompat.getEnabledListenerPackages(context).contains(context.packageName)
    }

    Function("openSettings") {
      val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }

    Function("setCaptureEnabled") { enabled: Boolean ->
      BankNotificationsStore.setCaptureEnabled(context, enabled)
    }

    Function("isCaptureEnabled") {
      BankNotificationsStore.isCaptureEnabled(context)
    }

    Function("setAllowedPackages") { packages: List<String> ->
      BankNotificationsStore.setAllowedPackages(context, packages)
    }

    Function("getAllowedPackages") {
      BankNotificationsStore.getAllowedPackages(context)
    }

    Function("getPending") {
      BankNotificationsStore.getPending(context).map { it.toMap() }
    }

    Function("acknowledge") { ids: List<String> ->
      BankNotificationsStore.acknowledge(context, ids)
    }

    /** Whether Finansai may post its own "Payment detected" notification. */
    Function("isPostNotificationsGranted") {
      BankNotificationListenerService.canPostNotifications(context)
    }

    /** Shows the Android 13+ runtime prompt if needed; re-check with isPostNotificationsGranted(). */
    Function("requestPostNotificationsPermission") {
      requestPostNotificationsPermission()
    }

    /**
     * Debug builds only: queues a fake captured notification (as if the bank app had posted it), so the
     * upload flow can be tested without a real payment. Returns false and does nothing in release builds.
     */
    Function("debugInject") { title: String?, text: String ->
      val debuggable = (context.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0
      if (!debuggable) return@Function false
      val now = System.currentTimeMillis()
      val item = CapturedNotification(
        externalId = BankNotificationsStore.sha256Hex("debug|$now|$text"),
        postedAtMillis = now,
        title = title,
        text = text,
        packageName = BankNotificationsStore.getAllowedPackages(context).firstOrNull() ?: "debug",
      )
      val added = BankNotificationsStore.append(context, item)
      if (added) BankNotificationListenerService.postPaymentDetected(context)
      added
    }
  }

  private fun requestPostNotificationsPermission() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
    if (ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) ==
      PackageManager.PERMISSION_GRANTED
    ) {
      return
    }
    val activity = appContext.currentActivity ?: return
    ActivityCompat.requestPermissions(
      activity,
      arrayOf(Manifest.permission.POST_NOTIFICATIONS),
      POST_NOTIFICATIONS_REQUEST_CODE,
    )
  }

  companion object {
    private const val POST_NOTIFICATIONS_REQUEST_CODE = 0x0B4B
  }
}
