import "@/lib/installStorage";
import "@/global.css";
import "@/i18n";
import { useEffect, useRef } from "react";
import { Stack, router, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { LoadingScreen } from "@/components/ui/spinner";
import { ToastHost } from "@/components/ui/toast";
import { useAuth } from "@/hooks/useAuth";
import { useStartupUpdate } from "@/lib/startupUpdate";
import { openedFromRecoveryLink } from "@/lib/supabase";
import { AuthProvider } from "@/providers/AuthProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { ThemeProvider, useTheme } from "@/theme/ThemeProvider";

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootNavigator() {
  const { user, isLoading } = useAuth();
  const { scheme } = useTheme();
  const updatePhase = useStartupUpdate();
  const ready = !isLoading && updatePhase === "ready";
  const pathname = usePathname();
  const recoveryHandled = useRef(false);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  // A password-recovery link signs the user in; make sure they land on the new-password form, wherever
  // the link pointed. Once only, so they can leave the form afterwards.
  useEffect(() => {
    if (!ready || !user || !openedFromRecoveryLink || recoveryHandled.current) return;
    recoveryHandled.current = true;
    if (pathname !== "/reset-password") router.replace("/reset-password");
  }, [ready, user, pathname]);

  // Native shows the splash screen until ready; web shows this spinner.
  if (!ready) return <LoadingScreen />;

  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!!user}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={!user}>
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="forgot-password" />
        </Stack.Protected>
        {/* Reachable signed in or out: the recovery link signs the user in first. */}
        <Stack.Screen name="reset-password" />
        {/* The bank redirect lands here; the native bounce must work without a session. */}
        <Stack.Screen name="bank/callback" />
        {/* Public legal pages: linked from the stores, Enable Banking and the sign-in screens. */}
        <Stack.Screen name="privacy" />
        <Stack.Screen name="terms" />
        <Stack.Screen name="delete-account" />
      </Stack>
      <ToastHost />
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <QueryProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
