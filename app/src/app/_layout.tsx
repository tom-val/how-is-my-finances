import "@/lib/installStorage";
import "@/global.css";
import "@/i18n";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { LoadingScreen } from "@/components/ui/spinner";
import { ToastHost } from "@/components/ui/toast";
import { useAuth } from "@/hooks/useAuth";
import { useStartupUpdate } from "@/lib/startupUpdate";
import { AuthProvider } from "@/providers/AuthProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { ThemeProvider, useTheme } from "@/theme/ThemeProvider";

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootNavigator() {
  const { user, isLoading } = useAuth();
  const { scheme } = useTheme();
  const updatePhase = useStartupUpdate();
  const ready = !isLoading && updatePhase === "ready";

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

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
