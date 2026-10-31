import { useMemo } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/ui/text";
import { useExpenses } from "@/features/expenses/hooks/useExpenses";
import { useIncomes } from "@/features/incomes/hooks/useIncomes";
import { ExpenseCard } from "@/features/expenses/components/ExpenseCard";
import { IncomeCard } from "@/features/incomes/components/IncomeCard";
import { CreateExpenseDialog } from "@/features/expenses/components/CreateExpenseDialog";
import { CreateIncomeDialog } from "@/features/incomes/components/CreateIncomeDialog";
import type { ExpenseWithCategory } from "@shared/types/expense";
import type { Income } from "@shared/types/income";

type TransactionItem =
  | { type: "expense"; date: string; data: ExpenseWithCategory }
  | { type: "income"; date: string; data: Income };

interface TransactionListProps {
  monthId: string;
}

export function TransactionList({ monthId }: TransactionListProps) {
  const { t } = useTranslation();
  const { data: expenses, isLoading: isLoadingExpenses, error: expensesError } = useExpenses(monthId);
  const { data: incomes, isLoading: isLoadingIncomes, error: incomesError } = useIncomes(monthId);
  const transactions = useMemo<TransactionItem[]>(() => {
    const items: TransactionItem[] = [];

    if (expenses) {
      for (const expense of expenses) {
        items.push({ type: "expense", date: expense.expenseDate, data: expense });
      }
    }

    if (incomes) {
      for (const income of incomes) {
        items.push({ type: "income", date: income.incomeDate, data: income });
      }
    }

    // Sort by date descending (newest first)
    items.sort((a, b) => b.date.localeCompare(a.date));

    return items;
  }, [expenses, incomes]);

  const isLoading = isLoadingExpenses || isLoadingIncomes;
  const hasError = expensesError || incomesError;

  return (
    <View>
      <View className="mb-4 flex-row items-center justify-between gap-2">
        <Text role="heading" className="text-lg font-semibold">
          {t("transactions.title")}
        </Text>
        <View className="flex-row items-center gap-2">
          <CreateExpenseDialog monthId={monthId} />
          <CreateIncomeDialog monthId={monthId} />
        </View>
      </View>

      {isLoading && <Text className="text-muted-foreground">{t("common.loading")}</Text>}

      {hasError && <Text className="text-destructive">{t("common.error")}</Text>}

      {!isLoading && !hasError && transactions.length === 0 && (
        <Text className="text-muted-foreground">{t("transactions.noTransactions")}</Text>
      )}

      {transactions.length > 0 && (
        <View className="gap-2">
          {transactions.map((item) =>
            item.type === "expense" ? (
              <ExpenseCard key={`expense-${item.data.id}`} expense={item.data} monthId={monthId} />
            ) : (
              <IncomeCard key={`income-${item.data.id}`} income={item.data} monthId={monthId} />
            ),
          )}
        </View>
      )}
    </View>
  );
}
