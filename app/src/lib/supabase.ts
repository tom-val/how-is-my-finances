import "./installStorage";
import { AppState, Platform } from "react-native";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

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
