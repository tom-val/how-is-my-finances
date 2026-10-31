import "@/lib/installStorage";
import "@/global.css";
import "@/i18n";
import { useEffect } from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
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

  if (!ready) return <View className="flex-1 bg-background" />;

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
