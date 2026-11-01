import "./installStorage";
import { AppState, Platform } from "react-native";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

/**
 * Web: this page load came from a password-recovery link (`#access_token=…&type=recovery`). Read before
 * the client is created: detectSessionInUrl consumes and clears the fragment, and its PASSWORD_RECOVERY
 * event fires before any component has subscribed. RootNavigator uses it to open /reset-password even
 * when the link landed elsewhere (Supabase falls back to the site URL for a redirect it doesn't allow).
 */
export const openedFromRecoveryLink =
  Platform.OS === "web" &&
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery";

/**
 * The session is persisted in `localStorage` — the browser's on web, the expo-sqlite polyfill on
 * native (./installStorage). Supabase sessions exceed SecureStore's 2 KB value limit,
 * which is why the Keychain/Keystore isn't used here.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: globalThis.localStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Recovery links land on /reset-password with tokens in the URL; ResetPasswordScreen reads them.
    detectSessionInUrl: Platform.OS === "web",
  },
});

// Native apps aren't "visible tabs": refresh tokens only while the app is in the foreground.
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      void supabase.auth.startAutoRefresh();
    } else {
      void supabase.auth.stopAutoRefresh();
    }
  });
}
