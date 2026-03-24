import { useTranslation } from "react-i18next";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/shared/ResponsiveDialog";
import { useExpensesByCategory } from "@/features/expenses/hooks/useExpenses";
import type { Category } from "@shared/types/category";

interface CategoryExpensesDialogProps {
  category: Category;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoryExpensesDialog({
  category,
  open,
  onOpenChange,
}: CategoryExpensesDialogProps) {
  const { t } = useTranslation();
  const { data: expenses, isLoading } = useExpensesByCategory(
    open ? category.id : null,
  );

  const total = expenses?.reduce((sum, e) => sum + e.amount, 0) ?? 0;

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-lg">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{category.name}</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <div className="flex flex-col gap-3">
          {isLoading && (
            <p className="text-sm text-muted-foreground">
              {t("common.loading")}
            </p>
          )}
          {expenses && expenses.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {t("categories.noExpenses")}
            </p>
          )}
          {expenses && expenses.length > 0 && (
            <>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {t("categories.expenseCount", { count: expenses.length })}
                </span>
                <span className="font-semibold text-foreground tabular-nums">
                  {total.toFixed(2)}
                </span>
              </div>
              <div className="flex flex-col gap-1 max-h-[60vh] overflow-y-auto">
                {expenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="flex items-center gap-3 rounded-md border px-3 py-1.5 text-sm"
                  >
                    <span className="text-xs text-muted-foreground shrink-0">
                      {expense.expenseDate}
                    </span>
                    <span className="font-medium truncate min-w-0 shrink">
                      {expense.itemName}
                    </span>
                    {expense.vendor && (
                      <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                        {expense.vendor}
                      </span>
                    )}
                    <span className="ml-auto font-semibold tabular-nums shrink-0">
                      {expense.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
