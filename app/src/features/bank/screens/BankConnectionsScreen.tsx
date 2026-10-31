import { useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Plus } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import { LoadingScreen } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { BankConnection, BankConnectionStatus } from "@shared/types/bank";
import { ConnectBankDialog } from "../components/ConnectBankDialog";
import {
  useBankConnections,
  useDeleteBankConnection,
  useUpdateBankAccount,
} from "../hooks/useBankConnections";
import { useConnectBank } from "../hooks/useConnectBank";
import { formatRelative, formatShortDate } from "../lib/format";

const STATUS_CLASSES: Record<BankConnectionStatus, { box: string; text: string }> = {
  active: { box: "bg-green-100 dark:bg-green-950/50", text: "text-green-800 dark:text-green-300" },
  pending: { box: "bg-muted", text: "text-muted-foreground" },
  expired: { box: "bg-amber-100 dark:bg-amber-950/50", text: "text-amber-800 dark:text-amber-300" },
  revoked: { box: "bg-muted", text: "text-muted-foreground" },
  failed: { box: "bg-red-100 dark:bg-red-950/50", text: "text-red-800 dark:text-red-300" },
};

function StatusChip({ status }: { status: BankConnectionStatus }) {
  const { t } = useTranslation();
  const classes = STATUS_CLASSES[status];
  return (
    <View className={cn("rounded-full px-2 py-0.5", classes.box)}>
      <Text className={cn("text-xs font-medium", classes.text)}>{t(`bank.status.${status}`)}</Text>
    </View>
  );
}

function ConnectionCard({ connection }: { connection: BankConnection }) {
  const { t, i18n } = useTranslation();
  const { connect, isPending: isReconnecting } = useConnectBank();
  const deleteConnection = useDeleteBankConnection();
  const updateAccount = useUpdateBankAccount();
  const [isDisconnectOpen, setIsDisconnectOpen] = useState(false);

  function handleDisconnect() {
    deleteConnection.mutate(connection.id, {
      onSuccess: () => {
        setIsDisconnectOpen(false);
        toast.success(t("bank.disconnected"));
      },
      onError: () => toast.error(t("common.error")),
    });
  }

  return (
    <Card className="py-0">
      <CardContent className="gap-4 px-4 py-4 sm:px-6 sm:py-5">
        <View className="flex-row items-center justify-between gap-3">
          <View className="min-w-0 flex-1">
            <Text numberOfLines={1} className="text-base font-semibold">
              {connection.aspspName}
            </Text>
            <Text className="text-xs text-muted-foreground">{t(`bank.countries.${connection.aspspCountry}`, connection.aspspCountry)}</Text>
          </View>
          <StatusChip status={connection.status} />
        </View>

        <View className="gap-1">
          {connection.consentExpiresAt && (
            <Text className="text-xs text-muted-foreground">
              {t("bank.consentValidUntil", { date: formatShortDate(connection.consentExpiresAt, i18n.language) })}
            </Text>
          )}
          <Text className="text-xs text-muted-foreground">
            {t("bank.lastSynced", {
              time: connection.lastSyncedAt
                ? formatRelative(connection.lastSyncedAt, i18n.language)
                : t("bank.never"),
            })}
          </Text>
          {connection.lastSyncError ? (
            <Text className="text-xs text-destructive">
              {t("bank.lastError", { error: connection.lastSyncError })}
            </Text>
          ) : null}
        </View>

        {connection.accounts.length > 0 && (
          <View className="gap-2">
            <Text className="text-sm font-medium">{t("bank.accounts")}</Text>
            {connection.accounts.map((account) => {
              const label = account.name ?? account.ibanMasked ?? account.id;
              return (
                <View
                  key={account.id}
                  className="flex-row items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                >
                  <View className="min-w-0 flex-1">
                    <Text numberOfLines={1} className="text-sm">
                      {label}
                    </Text>
                    <Text numberOfLines={1} className="text-xs text-muted-foreground">
                      {[account.name ? account.ibanMasked : null, account.currency].filter(Boolean).join(" · ")}
                    </Text>
                  </View>
                  <Switch
                    checked={account.isEnabled}
                    disabled={updateAccount.isPending}
                    onCheckedChange={(isEnabled) =>
                      updateAccount.mutate(
                        { id: account.id, isEnabled },
                        { onError: () => toast.error(t("common.error")) },
                      )
                    }
                    accessibilityLabel={t("bank.accountEnabled", { account: label })}
                  />
                </View>
              );
            })}
          </View>
        )}

        <View className="flex-row flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            textClassName="text-destructive"
            onPress={() => setIsDisconnectOpen(true)}
          >
            {t("bank.disconnect")}
          </Button>
          <Button
            variant={connection.status === "active" ? "outline" : "default"}
            size="sm"
            loading={isReconnecting}
            onPress={() => void connect({ name: connection.aspspName, country: connection.aspspCountry })}
          >
            {t("bank.reconnect")}
          </Button>
        </View>
      </CardContent>

      <ConfirmDialog
        open={isDisconnectOpen}
        onOpenChange={setIsDisconnectOpen}
        title={t("bank.disconnect")}
        description={t("bank.disconnectConfirm", { bank: connection.aspspName })}
        confirmLabel={t("bank.disconnect")}
        cancelLabel={t("common.cancel")}
        onConfirm={handleDisconnect}
        isPending={deleteConnection.isPending}
        destructive
      />
    </Card>
  );
}

export function BankConnectionsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: connections, isLoading, error, refetch } = useBankConnections();
  const [isConnectOpen, setIsConnectOpen] = useState(false);

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace("/settings");
  }

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Screen onRefresh={refetch}>
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          hitSlop={12}
          className="web:hover:opacity-70"
        >
          <Icon as={ArrowLeft} size={20} className="text-muted-foreground" />
        </Pressable>
        <Text role="heading" className="flex-1 text-2xl font-bold">
          {t("bank.title")}
        </Text>
        <Button size="sm" onPress={() => setIsConnectOpen(true)}>
          <Icon as={Plus} size={14} />
          <Text>{t("bank.connect")}</Text>
        </Button>
      </View>

      <Text className="text-sm text-muted-foreground">{t("bank.connectionsDescription")}</Text>

      {error ? (
        <Text className="text-destructive">{t("common.error")}</Text>
      ) : !connections || connections.length === 0 ? (
        <Text className="text-sm text-muted-foreground">{t("bank.noConnectionDescription")}</Text>
      ) : (
        connections.map((connection) => <ConnectionCard key={connection.id} connection={connection} />)
      )}

      <ConnectBankDialog open={isConnectOpen} onOpenChange={setIsConnectOpen} />
    </Screen>
  );
}
