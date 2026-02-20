import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useRecurringExpenses } from "../hooks/useRecurringExpenses";
import { RecurringExpenseCard } from "../components/RecurringExpenseCard";
import { CreateRecurringExpenseDialog } from "../components/CreateRecurringExpenseDialog";

export function RecurringExpensesPage() {
  const { t } = useTranslation();
  const { data: recurringExpenses, isLoading, error } = useRecurringExpenses();

  const monthlyTotal = useMemo(() => {
    if (!recurringExpenses) return 0;
    return recurringExpenses
      .filter((r) => r.isActive)
      .reduce((sum, r) => sum + r.amount, 0);
  }, [recurringExpenses]);

  if (isLoading) {
    return <p className="text-muted-foreground">{t("common.loading")}</p>;
  }

  if (error) {
    return <p className="text-destructive">{t("common.error")}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("recurring.title")}</h1>
        <CreateRecurringExpenseDialog />
      </div>
      {recurringExpenses && recurringExpenses.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {t("recurring.monthlyTotal")}:{" "}
          <span className="font-medium text-foreground">
            {monthlyTotal.toFixed(2)} EUR
          </span>
        </p>
      )}
      {recurringExpenses && recurringExpenses.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {recurringExpenses.map((item) => (
            <RecurringExpenseCard key={item.id} recurringExpense={item} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">
          {t("recurring.noRecurring")}
        </p>
      )}
    </div>
  );
}
