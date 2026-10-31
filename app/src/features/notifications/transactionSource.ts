import { useSyncExternalStore } from "react";
import { Platform } from "react-native";
import { getItem, setItem } from "@/lib/storage";
import * as BankNotifications from "../../../modules/bank-notifications";

/**
 * Where suggested expenses come from on this device:
 * - "bank": Enable Banking (the default, and the only option on iOS and web).
 * - "notifications": the Android listener captures the Swedbank app's notifications.
 */
export type TransactionSource = "bank" | "notifications";

const STORAGE_KEY = "transaction-source";
const listeners = new Set<() => void>();

/** Whether this device can use the "notifications" source at all. */
export function isNotificationSourceSupported(): boolean {
  return Platform.OS === "android" && BankNotifications.isSupported();
}

export function getTransactionSource(): TransactionSource {
  if (!isNotificationSourceSupported()) return "bank";
  return getItem(STORAGE_KEY) === "notifications" ? "notifications" : "bank";
}

/** Saves the choice on this device and turns the native listener's capturing on or off to match. */
export function setTransactionSource(source: TransactionSource): void {
  setItem(STORAGE_KEY, source);
  BankNotifications.setCaptureEnabled(source === "notifications");
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The current source; re-renders when it changes anywhere in the app. */
export function useTransactionSource(): TransactionSource {
  return useSyncExternalStore(subscribe, getTransactionSource, getTransactionSource);
}
