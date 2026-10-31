package expo.modules.banknotifications

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject
import java.security.MessageDigest
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/** One captured bank notification waiting to be uploaded by the JS side. */
data class CapturedNotification(
  val externalId: String,
  val postedAtMillis: Long,
  val title: String?,
  val text: String,
  val packageName: String,
) {
  fun toJson(): JSONObject = JSONObject().apply {
    put("externalId", externalId)
    put("postedAt", postedAtMillis)
    put("title", title ?: JSONObject.NULL)
    put("text", text)
    put("packageName", packageName)
  }

  fun toMap(): Map<String, Any?> = mapOf(
    "externalId" to externalId,
    "postedAt" to formatIsoUtc(postedAtMillis),
    "title" to title,
    "text" to text,
    "packageName" to packageName,
  )

  companion object {
    fun fromJson(json: JSONObject): CapturedNotification = CapturedNotification(
      externalId = json.getString("externalId"),
      postedAtMillis = json.getLong("postedAt"),
      title = if (json.isNull("title")) null else json.optString("title"),
      text = json.optString("text", ""),
      packageName = json.optString("packageName", ""),
    )

    private fun formatIsoUtc(millis: Long): String {
      val format = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
      format.timeZone = TimeZone.getTimeZone("UTC")
      return format.format(Date(millis))
    }
  }
}

/**
 * Device-local state shared by the listener service and the JS module, kept in SharedPreferences
 * so it survives the app process being killed while the listener keeps running.
 */
object BankNotificationsStore {
  private const val PREFS_NAME = "finansai_bank_notifications"
  private const val KEY_CAPTURE_ENABLED = "capture_enabled"
  private const val KEY_ALLOWED_PACKAGES = "allowed_packages"
  private const val KEY_QUEUE = "queue"

  /** Oldest items are dropped beyond this, so a long offline stretch can't grow the queue forever. */
  const val MAX_QUEUE_SIZE = 200

  val DEFAULT_ALLOWED_PACKAGES = listOf("lt.swedbank.mobile")

  private val lock = Any()

  private fun prefs(context: Context): SharedPreferences =
    context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

  fun isCaptureEnabled(context: Context): Boolean =
    prefs(context).getBoolean(KEY_CAPTURE_ENABLED, false)

  fun setCaptureEnabled(context: Context, enabled: Boolean) {
    prefs(context).edit().putBoolean(KEY_CAPTURE_ENABLED, enabled).apply()
  }

  fun getAllowedPackages(context: Context): List<String> {
    val raw = prefs(context).getString(KEY_ALLOWED_PACKAGES, null) ?: return DEFAULT_ALLOWED_PACKAGES
    return try {
      val array = JSONArray(raw)
      (0 until array.length()).map { array.getString(it) }
    } catch (_: Exception) {
      DEFAULT_ALLOWED_PACKAGES
    }
  }

  fun setAllowedPackages(context: Context, packages: List<String>) {
    prefs(context).edit().putString(KEY_ALLOWED_PACKAGES, JSONArray(packages).toString()).apply()
  }

  /** Appends the item unless one with the same externalId is queued. Returns true if it was added. */
  fun append(context: Context, item: CapturedNotification): Boolean = synchronized(lock) {
    val queue = readQueue(context)
    if (queue.any { it.externalId == item.externalId }) return@synchronized false
    queue.add(item)
    while (queue.size > MAX_QUEUE_SIZE) queue.removeAt(0)
    writeQueue(context, queue)
    true
  }

  fun getPending(context: Context): List<CapturedNotification> = synchronized(lock) {
    readQueue(context)
  }

  fun acknowledge(context: Context, ids: Collection<String>) = synchronized(lock) {
    if (ids.isEmpty()) return@synchronized
    val idSet = ids.toHashSet()
    val queue = readQueue(context)
    if (queue.removeAll { it.externalId in idSet }) writeQueue(context, queue)
  }

  private fun readQueue(context: Context): MutableList<CapturedNotification> {
    val raw = prefs(context).getString(KEY_QUEUE, null) ?: return mutableListOf()
    return try {
      val array = JSONArray(raw)
      MutableList(array.length()) { CapturedNotification.fromJson(array.getJSONObject(it)) }
    } catch (_: Exception) {
      mutableListOf()
    }
  }

  private fun writeQueue(context: Context, queue: List<CapturedNotification>) {
    val array = JSONArray()
    queue.forEach { array.put(it.toJson()) }
    // commit() rather than apply(): the listener and the JS thread may write back to back.
    prefs(context).edit().putString(KEY_QUEUE, array.toString()).commit()
  }

  fun sha256Hex(value: String): String =
    MessageDigest.getInstance("SHA-256")
      .digest(value.toByteArray(Charsets.UTF_8))
      .joinToString("") { "%02x".format(it) }
}
