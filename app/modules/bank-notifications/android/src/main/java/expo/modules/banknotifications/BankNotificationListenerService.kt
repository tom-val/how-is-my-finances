package expo.modules.banknotifications

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat

/**
 * Captures notifications from allowlisted bank apps (Swedbank by default) while the
 * "Bank notifications" transaction source is on, and queues them for the app to upload.
 * Everything else is ignored and never stored.
 */
class BankNotificationListenerService : NotificationListenerService() {

  override fun onNotificationPosted(sbn: StatusBarNotification?) {
    if (sbn == null) return
    try {
      handle(sbn)
    } catch (e: Exception) {
      Log.w(TAG, "Failed to capture a notification", e)
    }
  }

  private fun handle(sbn: StatusBarNotification) {
    val context = applicationContext
    if (!BankNotificationsStore.isCaptureEnabled(context)) return
    if (sbn.packageName !in BankNotificationsStore.getAllowedPackages(context)) return

    val notification = sbn.notification ?: return
    if (notification.flags and Notification.FLAG_GROUP_SUMMARY != 0) return

    val extras = notification.extras ?: return
    val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.trim()?.ifEmpty { null }
    val text = (
      extras.getCharSequence(Notification.EXTRA_BIG_TEXT)
        ?: extras.getCharSequence(Notification.EXTRA_TEXT)
      )?.toString()?.trim()
    if (text.isNullOrEmpty()) return

    val item = CapturedNotification(
      externalId = BankNotificationsStore.sha256Hex("${sbn.key}|${sbn.postTime}"),
      postedAtMillis = sbn.postTime,
      title = title,
      text = text,
      packageName = sbn.packageName,
    )
    if (BankNotificationsStore.append(context, item)) {
      postPaymentDetected(context)
    }
  }

  override fun onListenerDisconnected() {
    super.onListenerDisconnected()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      requestRebind(ComponentName(this, BankNotificationListenerService::class.java))
    }
  }

  companion object {
    private const val TAG = "BankNotifications"
    private const val CHANNEL_ID = "bank_activity"
    private const val NOTIFICATION_ID = 0x0B4A
    private const val DEEP_LINK = "finansai://inbox?upload=1"

    fun canPostNotifications(context: Context): Boolean {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
        ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) !=
        PackageManager.PERMISSION_GRANTED
      ) {
        return false
      }
      return NotificationManagerCompat.from(context).areNotificationsEnabled()
    }

    /** Posts (or refreshes) Finansai's own notification that opens the Inbox and triggers an upload. */
    fun postPaymentDetected(context: Context) {
      if (!canPostNotifications(context)) return

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val channel = NotificationChannel(
          CHANNEL_ID,
          context.getString(R.string.bank_notifications_channel_name),
          NotificationManager.IMPORTANCE_DEFAULT,
        ).apply {
          description = context.getString(R.string.bank_notifications_channel_description)
        }
        context.getSystemService(NotificationManager::class.java)?.createNotificationChannel(channel)
      }

      val intent = Intent(Intent.ACTION_VIEW, Uri.parse(DEEP_LINK)).apply {
        setPackage(context.packageName)
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
      }
      val pendingIntent = PendingIntent.getActivity(
        context,
        0,
        intent,
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
      )

      val notification = NotificationCompat.Builder(context, CHANNEL_ID)
        .setSmallIcon(smallIcon(context))
        .setContentTitle(context.getString(R.string.bank_notifications_detected_title))
        .setContentText(context.getString(R.string.bank_notifications_detected_text))
        .setContentIntent(pendingIntent)
        .setAutoCancel(true)
        .setCategory(NotificationCompat.CATEGORY_STATUS)
        .setPriority(NotificationCompat.PRIORITY_DEFAULT)
        .build()

      try {
        NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, notification)
      } catch (e: SecurityException) {
        Log.w(TAG, "Not allowed to post the payment notification", e)
      }
    }

    /**
     * Small icons must be a silhouette, and adaptive launcher icons crash notifications on some
     * Android 8 builds, so prefer a dedicated notification icon, then the monochrome launcher layer,
     * then the module's own card icon.
     */
    private fun smallIcon(context: Context): Int {
      val res = context.resources
      val pkg = context.packageName
      val candidates = listOf(
        "notification_icon" to "drawable",
        "ic_notification" to "drawable",
        "ic_launcher_monochrome" to "mipmap",
      )
      for ((name, type) in candidates) {
        @Suppress("DiscouragedApi")
        val id = res.getIdentifier(name, type, pkg)
        if (id != 0) return id
      }
      return R.drawable.bank_notifications_ic_payment
    }
  }
}
