import { useTranslation } from "react-i18next";
import { useParams, Link } from "react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TransactionList } from "../components/TransactionList";
import { useMonth } from "../hooks/useMonths";

export function MonthDetailPage() {
  const { t } = useTranslation();
  const { monthId } = useParams<{ monthId: string }>();
  const { data: month, isLoading, error } = useMonth(monthId!);

  if (isLoading) {
    return <p className="text-muted-foreground">{t("common.loading")}</p>;
  }

  if (error || !month) {
    return <p className="text-destructive">{t("common.error")}</p>;
  }

  const totalBudget = month.salary + month.totalIncome;
  const spentPercentage = totalBudget > 0
    ? Math.round(((month.totalSpent + month.plannedSpent) / totalBudget) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link to="/">
          <Button variant="ghost" size="sm">
            {t("common.back")}
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">
          {t(`months.monthNames.${month.monthNumber}`)} {month.year}
        </h1>
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
              {t("months.totalSpent")} · {spentPercentage}%
            </p>
            <p className="text-sm sm:text-lg font-bold">
              {month.totalSpent.toFixed(2)} EUR
            </p>
            {month.plannedSpent > 0 && (
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                + {month.plannedSpent.toFixed(2)} {t("months.plannedSpent")}
              </p>
            )}
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

      <TransactionList monthId={monthId!} />
    </div>
  );
}
