import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { LayoutList, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useExpenses } from "@/features/expenses/hooks/useExpenses";
import { useIncomes } from "@/features/incomes/hooks/useIncomes";
import { ExpenseCard } from "@/features/expenses/components/ExpenseCard";
import { IncomeCard } from "@/features/incomes/components/IncomeCard";
import { CreateExpenseDialog } from "@/features/expenses/components/CreateExpenseDialog";
import { CreateIncomeDialog } from "@/features/incomes/components/CreateIncomeDialog";
import type { ExpenseWithCategory } from "@shared/types/expense";
import type { Income } from "@shared/types/income";

type DisplayMode = "normal" | "compact";

const STORAGE_KEY = "expense-display-mode";

function getStoredDisplayMode(): DisplayMode {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "compact" ? "compact" : "normal";
}

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
  const [displayMode, setDisplayMode] = useState<DisplayMode>(
    getStoredDisplayMode,
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, displayMode);
  }, [displayMode]);

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

  function toggleDisplayMode() {
    setDisplayMode((prev) => (prev === "normal" ? "compact" : "normal"));
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("transactions.title")}</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={toggleDisplayMode}
            aria-label={
              displayMode === "normal"
                ? t("expenses.viewCompact")
                : t("expenses.viewNormal")
            }
          >
            {displayMode === "normal" ? (
              <List className="h-4 w-4" />
            ) : (
              <LayoutList className="h-4 w-4" />
            )}
          </Button>
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
                compact={displayMode === "compact"}
              />
            ) : (
              <IncomeCard
                key={`income-${item.data.id}`}
                income={item.data}
                monthId={monthId}
                compact={displayMode === "compact"}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}
