import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { CircleCheckBig, Landmark, Plus } from "lucide-react-native";
import { bankKeys } from "@/api/bank";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import { LoadingScreen } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { useCategories } from "@/features/categories/hooks/useCategories";
import { useVendors } from "@/features/expenses/hooks/useExpenses";
import { useTheme } from "@/theme/ThemeProvider";
import type { BankTransaction } from "@shared/types/bank";
import { BankTransactionCard } from "../components/BankTransactionCard";
import { BulkAcceptBar } from "../components/BulkAcceptBar";
import { ConnectBankDialog } from "../components/ConnectBankDialog";
import { ConsentExpiryBanner } from "../components/ConsentExpiryBanner";
import { SyncButton } from "../components/SyncButton";
import { useBankConnections } from "../hooks/useBankConnections";
import { useBankSync } from "../hooks/useBankSync";
import { useBankTransactions, usePendingCount } from "../hooks/useBankTransactions";
import { formatDayHeading, formatRelative } from "../lib/format";
import { useTransactionSource } from "@/features/notifications/transactionSource";

/** Suggestions grouped by booking date, newest day first. */
function groupByDate(transactions: BankTransaction[]): [string, BankTransaction[]][] {
  const groups = new Map<string, BankTransaction[]>();
  for (const tx of transactions) {
    const group = groups.get(tx.bookingDate);
    if (group) group.push(tx);
    else groups.set(tx.bookingDate, [tx]);
  }
  return [...groups.entries()].sort(([a], [b]) => b.localeCompare(a));
}

export function BankInboxScreen() {
  const { t, i18n } = useTranslation();
  const { colours } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ sync?: string; upload?: string }>();
  const notificationsMode = useTransactionSource() === "notifications";
  const [isConnectOpen, setIsConnectOpen] = useState(false);

  const connectionsQuery = useBankConnections();
  const transactionsQuery = useBankTransactions();
  const { data: pendingCount } = usePendingCount();
  const { data: categories } = useCategories();
  const { data: vendors } = useVendors();
  const sync = useBankSync();

  const connections = useMemo(() => connectionsQuery.data ?? [], [connectionsQuery.data]);
  const transactions = useMemo(() => transactionsQuery.data ?? [], [transactionsQuery.data]);
  const activeConnections = connections.filter((c) => c.status === "active");
  const canSync = activeConnections.length > 0 && !notificationsMode;
  const activeCategories = useMemo(() => (categories ?? []).filter((c) => !c.isArchived), [categories]);
  const groups = useMemo(() => groupByDate(transactions), [transactions]);
  const bulkIds = transactions
    .filter((tx) => tx.direction === "debit" && tx.suggestedCategoryId !== null)
    .map((tx) => tx.id);

  const lastSyncedAt = activeConnections
    .map((c) => c.lastSyncedAt)
    .filter((d): d is string => d !== null)
    .sort()
    .at(-1);

  const parsing = pendingCount?.parsing ?? 0;

  // `finansai://inbox?sync=1`: sync once, as soon as we know a connection exists.
  const syncRequested = params.sync === "1";
  const { start: startSync } = sync;
  const handledSyncParam = useRef(false);
  useEffect(() => {
    if (!syncRequested) {
      handledSyncParam.current = false;
      return;
    }
    if (handledSyncParam.current || !connectionsQuery.isSuccess) return;
    handledSyncParam.current = true;
    if (canSync) startSync();
    router.setParams({ sync: undefined });
  }, [syncRequested, connectionsQuery.isSuccess, canSync, startSync, router]);

  // `?upload=1` (from the "Payment detected" notification): the uploader runs on app focus by
  // itself; just make sure the "Reading N notifications…" line is fresh.
  const uploadRequested = params.upload === "1";
  useEffect(() => {
    if (uploadRequested) void queryClient.invalidateQueries({ queryKey: bankKeys.pendingCount });
  }, [uploadRequested, queryClient]);

  // Once uploaded notifications have all been read, pull the new suggestions in.
  const previousParsing = useRef(parsing);
  useEffect(() => {
    if (previousParsing.current > 0 && parsing === 0) {
      void queryClient.invalidateQueries({ queryKey: bankKeys.transactions });
    }
    previousParsing.current = parsing;
  }, [parsing, queryClient]);

  function refresh() {
    return Promise.all([connectionsQuery.refetch(), transactionsQuery.refetch()]);
  }

  if (connectionsQuery.isLoading || transactionsQuery.isLoading) {
    return <LoadingScreen />;
  }

  const showConnectCard = connections.length === 0 && !notificationsMode && transactions.length === 0;

  return (
    <Screen onRefresh={refresh}>
      <View className="gap-1">
        <View className="flex-row items-center justify-between gap-2">
          <Text role="heading" className="text-2xl font-bold">
            {t("bank.inbox")}
          </Text>
          {canSync && <SyncButton />}
        </View>
        {canSync && (
          <Text className="text-xs text-muted-foreground">
            {t("bank.lastSynced", {
              time: lastSyncedAt ? formatRelative(lastSyncedAt, i18n.language) : t("bank.never"),
            })}
          </Text>
        )}
      </View>

      {!notificationsMode && <ConsentExpiryBanner connections={connections} />}

      {parsing > 0 && (
        <View className="flex-row items-center gap-2">
          <ActivityIndicator size="small" color={colours["muted-foreground"]} />
          <Text className="text-sm text-muted-foreground">
            {t("bank.readingNotifications", { count: parsing })}
          </Text>
        </View>
      )}

      {transactionsQuery.error ? (
        <Text className="text-destructive">{t("common.error")}</Text>
      ) : showConnectCard ? (
        <Card>
          <CardContent className="items-center gap-3">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Icon as={Landmark} size={22} className="text-muted-foreground" />
            </View>
            <Text className="text-base font-semibold">{t("bank.noConnection")}</Text>
            <Text className="text-center text-sm text-muted-foreground">
              {t("bank.noConnectionDescription")}
            </Text>
            <Button onPress={() => setIsConnectOpen(true)}>
              <Icon as={Plus} size={16} />
              <Text>{t("bank.connect")}</Text>
            </Button>
          </CardContent>
        </Card>
      ) : transactions.length === 0 ? (
        parsing > 0 ? null : (
          <View className="items-center gap-2 py-10">
            <Icon as={CircleCheckBig} size={28} className="text-muted-foreground" />
            <Text className="text-base font-semibold">{t("bank.allCaughtUp")}</Text>
            <Text className="text-center text-sm text-muted-foreground">
              {t("bank.allCaughtUpDescription")}
            </Text>
          </View>
        )
      ) : (
        <>
          <BulkAcceptBar ids={bulkIds} />
          {groups.map(([date, items]) => (
            <View key={date} className="gap-2">
              <Text className="text-sm font-medium text-muted-foreground">
                {formatDayHeading(date, i18n.language)}
              </Text>
              {items.map((tx) => (
                <BankTransactionCard
                  key={tx.id}
                  transaction={tx}
                  categories={activeCategories}
                  vendors={vendors ?? []}
                  isCategorising={sync.phase === "categorising"}
                />
              ))}
            </View>
          ))}
        </>
      )}

      <ConnectBankDialog open={isConnectOpen} onOpenChange={setIsConnectOpen} />
    </Screen>
  );
}
