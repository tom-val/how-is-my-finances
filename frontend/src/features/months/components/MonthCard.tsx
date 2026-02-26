import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Card, CardContent } from "@/components/ui/card";
import type { MonthSummary } from "@shared/types/month";

interface MonthCardProps {
  month: MonthSummary;
}

export function MonthCard({ month }: MonthCardProps) {
  const { t } = useTranslation();

  return (
    <Link to={`/months/${month.id}`}>
      <Card className="p-0 transition-colors hover:bg-muted/50">
        <CardContent className="px-4 py-3">
          <p className="mb-1 text-sm font-semibold">
            {t(`months.monthNames.${month.monthNumber}`)} {month.year}
          </p>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t("months.salary")}</span>
            <span className="font-medium text-foreground">
              {month.salary.toFixed(2)} EUR
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t("months.remaining")}</span>
            <span
              className={`font-medium ${month.remaining < 0 ? "text-destructive" : "text-green-600 dark:text-green-400"}`}
            >
              {month.remaining.toFixed(2)} EUR
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
