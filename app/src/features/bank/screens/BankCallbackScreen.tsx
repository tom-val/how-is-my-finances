import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { CircleAlert, CircleCheck, ExternalLink } from "lucide-react-native";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { AuthScreenLayout } from "@/features/auth/components/AuthScreenLayout";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/theme/ThemeProvider";
import { useCompleteBankConnection } from "../hooks/useBankConnections";
import { NATIVE_CALLBACK_URL } from "../hooks/useConnectBank";

type CallbackStatus = "completing" | "success" | "alreadyCompleted" | "error";

/** The backend prefixes the state of consents started from the native app. */
const NATIVE_STATE_PREFIX = "n.";

function bounceToApp() {
  window.location.replace(NATIVE_CALLBACK_URL + window.location.search);
}

/**
 * `/bank/callback?code=…&state=…` — where the bank sends the user back after consent.
 * - Web, native state: bounce to `finansai://bank/callback` so the app's auth session (or deep
 *   link) picks it up. Needs no session in this browser.
 * - Otherwise (web, or the deep link opening the app): complete the connection as the signed-in
 *   user, then offer to sync.
 */
export function BankCallbackScreen() {
  const { t } = useTranslation();
  const { colours } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    code?: string;
    state?: string;
    error?: string;
    error_description?: string;
  }>();
  const { code, state } = params;
  const bankError = params.error_description ?? params.error;
  const isNativeBounce = Platform.OS === "web" && !!state?.startsWith(NATIVE_STATE_PREFIX);

  const complete = useCompleteBankConnection();
  const [status, setStatus] = useState<CallbackStatus>("completing");
  const started = useRef(false);

  const canComplete = !isNativeBounce && !bankError && !!code && !!state && !!user;
  const { mutate } = complete;

  useEffect(() => {
    if (isNativeBounce) bounceToApp();
  }, [isNativeBounce]);

  useEffect(() => {
    if (!canComplete || started.current) return;
    started.current = true;
    mutate(
      { code: code!, state: state! },
      {
        onSuccess: () => setStatus("success"),
        onError: (err) => {
          const already = err instanceof ApiError && (err.status === 409 || err.status === 400);
          setStatus(already ? "alreadyCompleted" : "error");
        },
      },
    );
  }, [canComplete, code, state, mutate]);

  function goToInbox(syncNow: boolean) {
    router.replace(syncNow ? { pathname: "/inbox", params: { sync: "1" } } : "/inbox");
  }

  // Web page reached from the native app's bank login: hand the code back to the app.
  if (isNativeBounce) {
    return (
      <AuthScreenLayout>
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>{t("bank.callback.returnToApp")}</CardTitle>
          </CardHeader>
          <CardContent className="gap-4">
            <Text className="text-sm text-muted-foreground">{t("bank.callback.returnToAppDescription")}</Text>
            <Button onPress={bounceToApp}>
              <Icon as={ExternalLink} size={16} />
              <Text>{t("bank.callback.openApp")}</Text>
            </Button>
          </CardContent>
        </Card>
      </AuthScreenLayout>
    );
  }

  const missingParams = !bankError && (!code || !state);
  const isError = !!bankError || missingParams || status === "error";

  let body;
  if (isError) {
    body = (
      <>
        <View className="flex-row items-center gap-2">
          <Icon as={CircleAlert} className="text-destructive" />
          <Text className="flex-1 text-sm">{t("bank.callback.error")}</Text>
        </View>
        {bankError ? <Text className="text-xs text-muted-foreground">{bankError}</Text> : null}
        {user ? (
          <Button variant="outline" onPress={() => router.replace("/settings/bank")}>
            {t("bank.callback.backToConnections")}
          </Button>
        ) : null}
      </>
    );
  } else if (!user) {
    body = (
      <>
        <Text className="text-sm text-muted-foreground">{t("bank.callback.signInRequired")}</Text>
        <Link href="/login" asChild>
          <Button>{t("auth.login")}</Button>
        </Link>
      </>
    );
  } else if (status === "completing") {
    body = (
      <View className="flex-row items-center gap-3">
        <ActivityIndicator color={colours["muted-foreground"]} />
        <Text className="text-sm text-muted-foreground">{t("bank.callback.completing")}</Text>
      </View>
    );
  } else {
    body = (
      <>
        <View className="flex-row items-center gap-2">
          <Icon as={CircleCheck} className="text-green-600" />
          <Text className="flex-1 text-sm">
            {status === "success" ? t("bank.callback.success") : t("bank.callback.alreadyCompleted")}
          </Text>
        </View>
        <Button onPress={() => goToInbox(true)}>{t("bank.callback.syncNow")}</Button>
        <Button variant="outline" onPress={() => goToInbox(false)}>
          {t("bank.callback.goToInbox")}
        </Button>
      </>
    );
  }

  return (
    <AuthScreenLayout>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("bank.title")}</CardTitle>
        </CardHeader>
        <CardContent className="gap-4">{body}</CardContent>
      </Card>
    </AuthScreenLayout>
  );
}
