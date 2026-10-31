import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { TriangleAlert } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import type { BankConnection } from "@shared/types/bank";
import { useConnectBank } from "../hooks/useConnectBank";
import { daysUntil, formatShortDate } from "../lib/format";

const WARN_DAYS = 14;

/** Connections whose consent has expired or runs out within two weeks. */
export function connectionsNeedingReconnect(connections: BankConnection[]): BankConnection[] {
  return connections.filter(
    (c) =>
      c.status === "expired" ||
      (c.status === "active" && c.consentExpiresAt !== null && daysUntil(c.consentExpiresAt) < WARN_DAYS),
  );
}

/** Warns about expiring or expired bank access, with Reconnect. */
export function ConsentExpiryBanner({ connections }: { connections: BankConnection[] }) {
  const { t, i18n } = useTranslation();
  const { connect, isPending } = useConnectBank();
  const expiring = connectionsNeedingReconnect(connections);

  if (expiring.length === 0) return null;

  return (
    <View className="gap-2">
      {expiring.map((connection) => {
        const expired =
          connection.status === "expired" ||
          (connection.consentExpiresAt !== null && daysUntil(connection.consentExpiresAt) < 0);
        return (
          <View
            key={connection.id}
            className="flex-row items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/40"
          >
            <Icon as={TriangleAlert} className="text-amber-600 dark:text-amber-400" />
            <Text className="flex-1 text-sm text-amber-900 dark:text-amber-100">
              {expired
                ? t("bank.consentExpired", { bank: connection.aspspName })
                : t("bank.consentExpires", {
                    bank: connection.aspspName,
                    date: formatShortDate(connection.consentExpiresAt!, i18n.language),
                  })}
            </Text>
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onPress={() => void connect({ name: connection.aspspName, country: connection.aspspCountry })}
            >
              {t("bank.reconnect")}
            </Button>
          </View>
        );
      })}
    </View>
  );
}
