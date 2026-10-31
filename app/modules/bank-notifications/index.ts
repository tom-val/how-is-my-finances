import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo";

/** A bank-app notification captured on the device and waiting to be uploaded. */
export interface CapturedBankNotification {
  /** sha256(notification key + "|" + post time), hex. Stable across retries. */
  externalId: string;
  /** ISO-8601 UTC timestamp of when the bank app posted the notification. */
  postedAt: string;
  title: string | null;
  text: string;
  /** The Android package that posted it (e.g. "lt.swedbank.mobile"). */
  packageName: string;
}

interface BankNotificationsNativeModule {
  isSupported(): boolean;
  isPermissionGranted(): boolean;
  openSettings(): void;
  setCaptureEnabled(enabled: boolean): void;
  isCaptureEnabled(): boolean;
  setAllowedPackages(packages: string[]): void;
  getAllowedPackages(): string[];
  getPending(): CapturedBankNotification[];
  acknowledge(ids: string[]): void;
  isPostNotificationsGranted(): boolean;
  requestPostNotificationsPermission(): void;
  debugInject(title: string | null, text: string): boolean;
}

// Android only. iOS, web and builds made before the module existed get null, and every call below
// becomes a safe no-op instead of crashing.
const native =
  Platform.OS === "android"
    ? requireOptionalNativeModule<BankNotificationsNativeModule>("BankNotifications")
    : null;

/** True on Android builds that include the notification listener. */
export function isSupported(): boolean {
  return native?.isSupported() ?? false;
}

/** Whether Finansai has notification access (Settings → Notifications → Device & app notifications). */
export function isPermissionGranted(): boolean {
  return native?.isPermissionGranted() ?? false;
}

/** Opens the system's notification-access screen. */
export function openSettings(): void {
  native?.openSettings();
}

/** Turns capturing on or off; the listener ignores everything while it's off. */
export function setCaptureEnabled(enabled: boolean): void {
  native?.setCaptureEnabled(enabled);
}

export function isCaptureEnabled(): boolean {
  return native?.isCaptureEnabled() ?? false;
}

/** Android packages whose notifications are captured. Defaults to ["lt.swedbank.mobile"]. */
export function setAllowedPackages(packages: string[]): void {
  native?.setAllowedPackages(packages);
}

export function getAllowedPackages(): string[] {
  return native?.getAllowedPackages() ?? [];
}

/** Captured notifications not yet acknowledged, oldest first (at most 200 are kept). */
export function getPending(): CapturedBankNotification[] {
  return native?.getPending() ?? [];
}

/** Removes uploaded notifications from the device queue. */
export function acknowledge(ids: string[]): void {
  if (ids.length > 0) native?.acknowledge(ids);
}

/** Whether Finansai may post its own "Payment detected" notification. */
export function isPostNotificationsGranted(): boolean {
  return native?.isPostNotificationsGranted() ?? false;
}

/** Shows the Android 13+ notification prompt if it hasn't been granted; doesn't wait for the answer. */
export function requestPostNotificationsPermission(): void {
  native?.requestPostNotificationsPermission();
}

/**
 * For testing only: queues a fake captured notification as if the bank app had posted it.
 * Works in debuggable builds; returns false (and does nothing) in release builds and off Android.
 */
export function debugInject(title: string | null, text: string): boolean {
  return native?.debugInject(title, text) ?? false;
}
