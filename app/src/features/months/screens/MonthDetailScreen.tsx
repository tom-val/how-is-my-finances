import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Link, router, useLocalSearchParams } from "expo-router";
import { ChevronRight, Pencil } from "lucide-react-native";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { TransactionList } from "../components/TransactionList";
import { SpendingProgressBar } from "../components/SpendingProgressBar";
import { useMonth } from "../hooks/useMonths";
import { useExpenses } from "@/features/expenses/hooks/useExpenses";
import { useIncomes } from "@/features/incomes/hooks/useIncomes";
import { EditMonthDialog } from "../components/EditMonthDialog";

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace("/");
}

export function MonthDetailScreen() {
  const { t } = useTranslation();
  const { monthId } = useLocalSearchParams<{ monthId: string }>();
  const { data: month, isLoading, error, refetch: refetchMonth, isRefetching } = useMonth(monthId);
  const { data: expenses, refetch: refetchExpenses } = useExpenses(monthId);
  const { refetch: refetchIncomes } = useIncomes(monthId);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const recurringTotal = useMemo(() => {
    if (!expenses) return 0;
    return expenses.filter((e) => e.isRecurringInstance).reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  function handleRefresh() {
    void refetchMonth();
    void refetchExpenses();
    void refetchIncomes();
  }

  if (isLoading) {
    return (
      <Screen>
        <Text className="text-muted-foreground">{t("common.loading")}</Text>
      </Screen>
    );
  }

  if (error || !month) {
    return (
      <Screen onRefresh={handleRefresh} refreshing={isRefetching}>
        <Text className="text-destructive">{t("common.error")}</Text>
      </Screen>
    );
  }

  const totalBudget = month.salary + month.totalIncome;
  const spentPercentage = totalBudget > 0 ? Math.round((month.totalSpent / totalBudget) * 100) : 0;
  const plannedPercentage = totalBudget > 0 ? Math.round((month.plannedSpent / totalBudget) * 100) : 0;

  const statCard = "grow basis-[47%] p-0 lg:basis-[22%]";
  const statContent = "px-3 py-2 sm:px-4 sm:py-3";
  const statLabel = "text-[10px] text-muted-foreground sm:text-xs";
  const statValue = "text-sm font-bold sm:text-lg";

  return (
    <Screen onRefresh={handleRefresh} refreshing={isRefetching}>
      <View className="flex-row items-center gap-4">
        <Button variant="ghost" size="sm" onPress={goBack}>
          {t("common.back")}
        </Button>
        <View className="flex-1">
          <Text role="heading" className="text-2xl font-bold">
            {t(`months.monthNames.${month.monthNumber}`)} {month.year}
          </Text>
          <Text className="text-xs text-muted-foreground">
            {month.daysRemaining} {t("months.daysRemaining").toLowerCase()}
          </Text>
        </View>
        <Button
          variant="ghost"
          size="icon"
          onPress={() => setIsEditOpen(true)}
          accessibilityLabel={t("months.editMonth")}
        >
          <Icon as={Pencil} />
        </Button>
      </View>

      <View className="flex-row flex-wrap gap-2 sm:gap-3">
        <Card className={cn(statCard, "gap-0")}>
          <CardContent className={statContent}>
            <Text className={statLabel}>{t("months.salary")}</Text>
            <Text className={statValue}>{month.salary.toFixed(2)} EUR</Text>
          </CardContent>
        </Card>
        <Card className={cn(statCard, "gap-0")}>
          <CardContent className={statContent}>
            <Text className={statLabel}>{t("recurring.recurringTotal")}</Text>
            <Text className={statValue}>{recurringTotal.toFixed(2)} EUR</Text>
          </CardContent>
        </Card>
        <Card className={cn(statCard, "gap-0")}>
          <CardContent className={statContent}>
            <Text className={statLabel}>{t("incomes.extraIncome")}</Text>
            <Text className={cn(statValue, "text-green-600 dark:text-green-400")}>
              {month.totalIncome.toFixed(2)} EUR
            </Text>
          </CardContent>
        </Card>
        <Card className={cn(statCard, "gap-0")}>
          <CardContent className={statContent}>
            <Text className={statLabel}>{t("months.remaining")}</Text>
            <Text
              className={cn(
                statValue,
                month.remaining < 0 ? "text-destructive" : "text-green-600 dark:text-green-400",
              )}
            >
              {month.remaining.toFixed(2)} EUR
            </Text>
          </CardContent>
        </Card>
      </View>

      <SpendingProgressBar
        spentAmount={month.totalSpent}
        plannedAmount={month.plannedSpent}
        spentPercentage={spentPercentage}
        plannedPercentage={plannedPercentage}
      />

      {month.categoryBreakdown.length > 0 && (
        <Link href={`/months/${monthId}/breakdown`} asChild>
          <Pressable
            accessibilityRole="link"
            className="min-h-11 flex-row items-center justify-between rounded-lg border border-border px-4 py-3 active:bg-muted/50 web:hover:bg-muted/50"
          >
            <Text className="text-sm font-semibold">{t("months.categoryBreakdown")}</Text>
            <Icon as={ChevronRight} className="text-muted-foreground" />
          </Pressable>
        </Link>
      )}

      <TransactionList monthId={monthId} />

      {isEditOpen && <EditMonthDialog month={month} open={isEditOpen} onOpenChange={setIsEditOpen} />}
    </Screen>
  );
}
