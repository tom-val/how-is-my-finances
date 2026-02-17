import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Month } from "@shared/types/month";

interface MonthCardProps {
  month: Month;
}

export function MonthCard({ month }: MonthCardProps) {
  const { t } = useTranslation();

  return (
    <Link to={`/months/${month.id}`}>
      <Card className="transition-colors hover:bg-muted/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {t(`months.monthNames.${month.monthNumber}`)} {month.year}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t("months.salary")}:{" "}
            <span className="font-medium text-foreground">
              {month.salary.toFixed(2)} EUR
            </span>
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
