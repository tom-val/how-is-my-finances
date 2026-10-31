import { Platform } from "react-native";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useTranslation } from "react-i18next";
import { toast } from "@/components/ui/toast";
import { useCompleteBankConnection, useStartBankConnection } from "./useBankConnections";

/** Where the web callback page bounces native logins to (it must match the backend's bounce). */
export const NATIVE_CALLBACK_URL = "finansai://bank/callback";

export type ConnectOutcome = "redirected" | "connected" | "cancelled" | "failed";

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Starts a bank consent and sends the user to the bank. Web: a full-page redirect (the callback
 * route completes it). Native: an auth session that returns the bounced `finansai://` URL, then
 * completes here.
 */
export function useConnectBank() {
  const { t } = useTranslation();
  const start = useStartBankConnection();
  const complete = useCompleteBankConnection();

  async function connect(aspsp: { name: string; country: string }): Promise<ConnectOutcome> {
    try {
      const { redirectUrl } = await start.mutateAsync({
        aspspName: aspsp.name,
        aspspCountry: aspsp.country,
        client: Platform.OS === "web" ? "web" : "native",
      });

      if (Platform.OS === "web") {
        window.location.assign(redirectUrl);
        return "redirected";
      }

      const result = await WebBrowser.openAuthSessionAsync(redirectUrl, NATIVE_CALLBACK_URL);
      if (result.type !== "success") return "cancelled";

      const { queryParams } = Linking.parse(result.url);
      const code = firstParam(queryParams?.code as string | string[] | undefined);
      const state = firstParam(queryParams?.state as string | string[] | undefined);
      if (!code || !state) {
        toast.error(t("bank.callback.error"));
        return "failed";
      }

      await complete.mutateAsync({ code, state });
      toast.success(t("bank.callback.success"));
      return "connected";
    } catch (err) {
      console.warn("Bank connection failed:", err);
      toast.error(t("bank.callback.error"));
      return "failed";
    }
  }

  return { connect, isPending: start.isPending || complete.isPending };
}
