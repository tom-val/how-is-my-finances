import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useParams, Link } from "react-router";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useMonth } from "../hooks/useMonths";
import { useExpenses } from "@/features/expenses/hooks/useExpenses";
import { ExpenseCard } from "@/features/expenses/components/ExpenseCard";
import type { ExpenseWithCategory } from "@shared/types/expense";

interface CategoryRowProps {
  categoryId: string;
  categoryName: string;
  total: number;
  totalSpent: number;
  expenses: ExpenseWithCategory[];
  monthId: string;
}

function CategoryRow({ categoryId, categoryName, total, totalSpent, expenses, monthId }: CategoryRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const percentage = totalSpent > 0
    ? Math.round((total / totalSpent) * 100)
    : 0;

  const categoryExpenses = useMemo(
    () => expenses.filter((e) => e.categoryId === categoryId),
    [expenses, categoryId],
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

        <span className="truncate text-left">{categoryName}</span>

        <span className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums">
          {percentage}%
        </span>

        <span className="shrink-0 font-medium tabular-nums">
          {total.toFixed(2)} EUR
        </span>
      </button>

      {isExpanded && (
        <div className="flex flex-col gap-2 pl-7 pr-1 pb-2 pt-1">
          {categoryExpenses.map((expense) => (
            <ExpenseCard
              key={expense.id}
              expense={expense}
              monthId={monthId}
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
  const [showRecurring, setShowRecurring] = useState(true);

  const isLoading = isLoadingMonth || isLoadingExpenses;

  const filteredExpenses = useMemo(() => {
    if (!expenses) return [];
    return showRecurring
      ? expenses
      : expenses.filter((e) => !e.isRecurringInstance);
  }, [expenses, showRecurring]);

  const categoryBreakdown = useMemo(() => {
    const grouped = new Map<string, { categoryName: string; total: number }>();

    for (const expense of filteredExpenses) {
      const existing = grouped.get(expense.categoryId);
      if (existing) {
        existing.total += expense.amount;
      } else {
        grouped.set(expense.categoryId, {
          categoryName: expense.categoryName,
          total: expense.amount,
        });
      }
    }

    return Array.from(grouped.entries())
      .map(([categoryId, { categoryName, total }]) => ({ categoryId, categoryName, total }))
      .sort((a, b) => b.total - a.total);
  }, [filteredExpenses]);

  const totalSpent = categoryBreakdown.reduce((sum, item) => sum + item.total, 0);

  if (isLoading) {
    return <p className="text-muted-foreground">{t("common.loading")}</p>;
  }

  if (monthError || !month) {
    return <p className="text-destructive">{t("common.error")}</p>;
  }

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

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t(`months.monthNames.${month.monthNumber}`)} {month.year} · {totalSpent.toFixed(2)} EUR {t("months.totalSpent").toLowerCase()}
        </p>
        <div className="flex items-center gap-2">
          <Switch
            id="show-recurring"
            checked={showRecurring}
            onCheckedChange={setShowRecurring}
          />
          <Label htmlFor="show-recurring" className="text-sm">
            {t("categories.showRecurring")}
          </Label>
        </div>
      </div>

      {categoryBreakdown.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("months.noCategoryData")}
        </p>
      ) : (
        <Card className="p-0">
          <CardContent className="px-1 py-1 sm:px-2 sm:py-2">
            <ul className="flex flex-col divide-y">
              {categoryBreakdown.map((item) => (
                <CategoryRow
                  key={item.categoryId}
                  categoryId={item.categoryId}
                  categoryName={item.categoryName}
                  total={item.total}
                  totalSpent={totalSpent}
                  expenses={filteredExpenses}
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
