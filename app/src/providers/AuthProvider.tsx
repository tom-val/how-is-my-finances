import { useEffect, useState, type ReactNode } from "react";
import { Platform } from "react-native";
import * as Linking from "expo-linking";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { AuthContext } from "./AuthContext";

/**
 * Where the password-reset email sends the user. Web: back to this origin. Native: the app's own
 * scheme (finansai://reset-password), which must be listed in Supabase Auth's redirect URLs.
 */
function resetPasswordRedirect(): string {
  if (Platform.OS === "web") return `${window.location.origin}/reset-password`;
  return Linking.createURL("/reset-password");
}

/**
 * Native only: a recovery link opens the app with the session in the URL fragment
 * (`finansai://reset-password#access_token=…&refresh_token=…&type=recovery`). supabase-js only parses
 * that on web (`detectSessionInUrl`), so adopt the session here.
 */
async function adoptSessionFromUrl(url: string | null) {
  if (!url) return;
  const hash = url.split("#")[1];
  if (!hash) return;
  const params = new URLSearchParams(hash);
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (!accessToken || !refreshToken) return;
  await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (Platform.OS !== "web") {
        await adoptSessionFromUrl(await Linking.getInitialURL()).catch(() => undefined);
      }
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    }
    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    const linkSubscription =
      Platform.OS !== "web"
        ? Linking.addEventListener("url", ({ url }) => {
            void adoptSessionFromUrl(url).catch(() => undefined);
          })
        : null;

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      linkSubscription?.remove();
    };
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  }

  async function signUp(email: string, password: string) {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async function resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: resetPasswordRedirect(),
    });
    if (error) throw error;
  }

  async function updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
