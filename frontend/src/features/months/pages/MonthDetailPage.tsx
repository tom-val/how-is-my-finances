import { useTranslation } from "react-i18next";
import { useParams, Link } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

  const spentPercentage = month.salary > 0
    ? Math.round((month.totalSpent / month.salary) * 100)
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

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {t("months.salary")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{month.salary.toFixed(2)} EUR</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {t("months.totalSpent")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {month.totalSpent.toFixed(2)} EUR
            </p>
            <p className="text-sm text-muted-foreground">
              {spentPercentage}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {t("months.remaining")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold ${month.remaining < 0 ? "text-destructive" : ""}`}
            >
              {month.remaining.toFixed(2)} EUR
            </p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">{t("expenses.title")}</h2>
        <p className="text-muted-foreground">{t("expenses.noExpenses")}</p>
      </div>
    </div>
  );
}
