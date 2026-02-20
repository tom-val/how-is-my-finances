import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useParams, Link } from "react-router";
import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TransactionList } from "../components/TransactionList";
import { SpendingProgressBar } from "../components/SpendingProgressBar";
import { useMonth } from "../hooks/useMonths";
import { useExpenses } from "@/features/expenses/hooks/useExpenses";

export function MonthDetailPage() {
  const { t } = useTranslation();
  const { monthId } = useParams<{ monthId: string }>();
  const { data: month, isLoading, error } = useMonth(monthId!);
  const { data: expenses } = useExpenses(monthId!);

  const recurringTotal = useMemo(() => {
    if (!expenses) return 0;
    return expenses
      .filter((e) => e.isRecurringInstance)
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  if (isLoading) {
    return <p className="text-muted-foreground">{t("common.loading")}</p>;
  }

  if (error || !month) {
    return <p className="text-destructive">{t("common.error")}</p>;
  }

  const totalBudget = month.salary + month.totalIncome;
  const spentPercentage = totalBudget > 0
    ? Math.round((month.totalSpent / totalBudget) * 100)
    : 0;
  const plannedPercentage = totalBudget > 0
    ? Math.round((month.plannedSpent / totalBudget) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link to="/">
          <Button variant="ghost" size="sm">
            {t("common.back")}
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">
            {t(`months.monthNames.${month.monthNumber}`)} {month.year}
          </h1>
          <p className="text-xs text-muted-foreground">
            {month.daysRemaining} {t("months.daysRemaining").toLowerCase()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <Card className="p-0">
          <CardContent className="px-3 py-2 sm:px-4 sm:py-3">
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {t("months.salary")}
            </p>
            <p className="text-sm sm:text-lg font-bold">
              {month.salary.toFixed(2)} EUR
            </p>
          </CardContent>
        </Card>
        <Card className="p-0">
          <CardContent className="px-3 py-2 sm:px-4 sm:py-3">
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {t("recurring.recurringTotal")}
            </p>
            <p className="text-sm sm:text-lg font-bold">
              {recurringTotal.toFixed(2)} EUR
            </p>
          </CardContent>
        </Card>
        <Card className="p-0">
          <CardContent className="px-3 py-2 sm:px-4 sm:py-3">
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {t("incomes.extraIncome")}
            </p>
            <p className="text-sm sm:text-lg font-bold text-green-600 dark:text-green-400">
              {month.totalIncome.toFixed(2)} EUR
            </p>
          </CardContent>
        </Card>
        <Card className="p-0">
          <CardContent className="px-3 py-2 sm:px-4 sm:py-3">
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {t("months.remaining")}
            </p>
            <p
              className={`text-sm sm:text-lg font-bold ${month.remaining < 0 ? "text-destructive" : ""}`}
            >
              {month.remaining.toFixed(2)} EUR
            </p>
          </CardContent>
        </Card>
      </div>

      <SpendingProgressBar
        spentAmount={month.totalSpent}
        plannedAmount={month.plannedSpent}
        spentPercentage={spentPercentage}
        plannedPercentage={plannedPercentage}
      />

      {month.categoryBreakdown.length > 0 && (
        <Link
          to={`/months/${monthId}/breakdown`}
          className="flex items-center justify-between rounded-lg border px-4 py-3 hover:bg-muted/50 transition-colors"
        >
          <span className="text-sm font-semibold">
            {t("months.categoryBreakdown")}
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      )}

      <TransactionList monthId={monthId!} />
    </div>
  );
}
