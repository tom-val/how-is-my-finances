import { useMemo } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { Screen } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import { useRecurringExpenses } from "../hooks/useRecurringExpenses";
import { RecurringExpenseCard } from "../components/RecurringExpenseCard";
import { CreateRecurringExpenseDialog } from "../components/CreateRecurringExpenseDialog";

export function RecurringExpensesScreen() {
  const { t } = useTranslation();
  const { data: recurringExpenses, isLoading, error, refetch, isRefetching } = useRecurringExpenses();

  const monthlyTotal = useMemo(() => {
    if (!recurringExpenses) return 0;
    return recurringExpenses.filter((r) => r.isActive).reduce((sum, r) => sum + r.amount, 0);
  }, [recurringExpenses]);

  if (isLoading) {
    return (
      <Screen>
        <Text className="text-muted-foreground">{t("common.loading")}</Text>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen onRefresh={() => void refetch()} refreshing={isRefetching}>
        <Text className="text-destructive">{t("common.error")}</Text>
      </Screen>
    );
  }

  return (
    <Screen onRefresh={() => void refetch()} refreshing={isRefetching}>
      <View className="flex-row items-center justify-between gap-2">
        <Text role="heading" className="flex-1 text-2xl font-bold">
          {t("recurring.title")}
        </Text>
        <CreateRecurringExpenseDialog />
      </View>
      {recurringExpenses && recurringExpenses.length > 0 && (
        <Text className="text-sm text-muted-foreground">
          {t("recurring.monthlyTotal")}:{" "}
          <Text className="text-sm font-medium text-foreground">{monthlyTotal.toFixed(2)} EUR</Text>
        </Text>
      )}
      {recurringExpenses && recurringExpenses.length > 0 ? (
        <View className="-m-1 flex-row flex-wrap">
          {recurringExpenses.map((item) => (
            <View key={item.id} className="w-full p-1 sm:w-1/2 lg:w-1/3">
              <RecurringExpenseCard recurringExpense={item} />
            </View>
          ))}
        </View>
      ) : (
        <Text className="text-muted-foreground">{t("recurring.noRecurring")}</Text>
      )}
    </Screen>
  );
}
