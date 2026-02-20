import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useParams, Link } from "react-router";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMonth } from "../hooks/useMonths";
import { useExpenses } from "@/features/expenses/hooks/useExpenses";
import { ExpenseCard } from "@/features/expenses/components/ExpenseCard";
import type { CategoryBreakdownItem } from "@shared/types/month";
import type { ExpenseWithCategory } from "@shared/types/expense";

interface CategoryRowProps {
  item: CategoryBreakdownItem;
  totalSpent: number;
  expenses: ExpenseWithCategory[];
  monthId: string;
}

function CategoryRow({ item, totalSpent, expenses, monthId }: CategoryRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const percentage = totalSpent > 0
    ? Math.round((item.total / totalSpent) * 100)
    : 0;

  const categoryExpenses = useMemo(
    () => expenses.filter((e) => e.categoryId === item.categoryId),
    [expenses, item.categoryId],
  );

  return (
    <li>
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}

        <span className="truncate text-left">{item.categoryName}</span>

        <span className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums">
          {percentage}%
        </span>

        <span className="shrink-0 font-medium tabular-nums">
          {item.total.toFixed(2)} EUR
        </span>
      </button>

      {isExpanded && (
        <div className="flex flex-col gap-2 pl-7 pr-1 pb-2 pt-1">
          {categoryExpenses.map((expense) => (
            <ExpenseCard
              key={expense.id}
              expense={expense}
              monthId={monthId}
              compact
            />
          ))}
        </div>
      )}
    </li>
  );
}

export function CategoryBreakdownPage() {
  const { t } = useTranslation();
  const { monthId } = useParams<{ monthId: string }>();
  const { data: month, isLoading: isLoadingMonth, error: monthError } = useMonth(monthId!);
  const { data: expenses, isLoading: isLoadingExpenses } = useExpenses(monthId!);

  const isLoading = isLoadingMonth || isLoadingExpenses;

  if (isLoading) {
    return <p className="text-muted-foreground">{t("common.loading")}</p>;
  }

  if (monthError || !month) {
    return <p className="text-destructive">{t("common.error")}</p>;
  }

  const totalSpent = month.totalSpent + month.plannedSpent;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link to={`/months/${monthId}`}>
          <Button variant="ghost" size="sm">
            {t("common.back")}
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">
          {t("months.categoryBreakdown")}
        </h1>
      </div>

      <p className="text-sm text-muted-foreground">
        {t(`months.monthNames.${month.monthNumber}`)} {month.year} · {totalSpent.toFixed(2)} EUR {t("months.totalSpent").toLowerCase()}
      </p>

      {month.categoryBreakdown.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("months.noCategoryData")}
        </p>
      ) : (
        <Card className="p-0">
          <CardContent className="px-1 py-1 sm:px-2 sm:py-2">
            <ul className="flex flex-col divide-y">
              {month.categoryBreakdown.map((item) => (
                <CategoryRow
                  key={item.categoryId}
                  item={item}
                  totalSpent={totalSpent}
                  expenses={expenses ?? []}
                  monthId={monthId!}
                />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
