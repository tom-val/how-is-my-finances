import "./installStorage";

/**
 * Synchronous key-value storage for small preferences and the Supabase session.
 *
 * Native: `expo-sqlite/localStorage/install` (via ./installStorage) polyfills
 * `globalThis.localStorage` on top of SQLite. Web: the browser's own localStorage.
 *
 * Every call is wrapped — a private window with site data blocked throws on access, and a storage
 * failure must fall back to defaults, never crash the app.
 */
export function getItem(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function setItem(key: string, value: string): void {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    // best-effort persistence
  }
}

export function removeItem(key: string): void {
  try {
    globalThis.localStorage?.removeItem(key);
  } catch {
    // ignore
  }
}
