import { useMemo } from "react";
import { useTranslation } from "react-i18next";
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
  const {
    data: expenses,
    isLoading: isLoadingExpenses,
    error: expensesError,
  } = useExpenses(monthId);
  const {
    data: incomes,
    isLoading: isLoadingIncomes,
    error: incomesError,
  } = useIncomes(monthId);
  const transactions = useMemo<TransactionItem[]>(() => {
    const items: TransactionItem[] = [];

    if (expenses) {
      for (const expense of expenses) {
        items.push({
          type: "expense",
          date: expense.expenseDate,
          data: expense,
        });
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
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("transactions.title")}</h2>
        <div className="flex items-center gap-2">
          <CreateExpenseDialog monthId={monthId} />
          <CreateIncomeDialog monthId={monthId} />
        </div>
      </div>

      {isLoading && (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      )}

      {hasError && <p className="text-destructive">{t("common.error")}</p>}

      {!isLoading && !hasError && transactions.length === 0 && (
        <p className="text-muted-foreground">{t("transactions.noTransactions")}</p>
      )}

      {transactions.length > 0 && (
        <div className="flex flex-col gap-2">
          {transactions.map((item) =>
            item.type === "expense" ? (
              <ExpenseCard
                key={`expense-${item.data.id}`}
                expense={item.data}
                monthId={monthId}
              />
            ) : (
              <IncomeCard
                key={`income-${item.data.id}`}
                income={item.data}
                monthId={monthId}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}
