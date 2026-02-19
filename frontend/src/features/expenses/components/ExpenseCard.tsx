import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ExpenseWithCategory } from "@shared/types/expense";
import { EditExpenseDialog } from "./EditExpenseDialog";
import { DeleteExpenseDialog } from "./DeleteExpenseDialog";

interface ExpenseCardProps {
  expense: ExpenseWithCategory;
  monthId: string;
  compact?: boolean;
}

function isPlannedExpense(expenseDate: string): boolean {
  return expenseDate > new Date().toISOString().split("T")[0];
}

export function ExpenseCard({ expense, monthId, compact = false }: ExpenseCardProps) {
  const { t } = useTranslation();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const isPlanned = isPlannedExpense(expense.expenseDate);

  if (compact) {
    return (
      <>
        <div
          className={cn(
            "flex items-center gap-3 rounded-md border px-3 py-1.5 text-sm hover:bg-muted/50",
            isPlanned && "opacity-60",
          )}
        >
          <span className="font-medium truncate min-w-0 shrink">{expense.itemName}</span>
          <span className="text-xs text-muted-foreground shrink-0">
            {expense.categoryName}
          </span>
          <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">
            {expense.expenseDate}
          </span>
          {isPlanned && (
            <span className="rounded bg-muted px-1 py-0.5 text-[10px] font-medium shrink-0 hidden sm:inline">
              {t("months.plannedSpent")}
            </span>
          )}
          {expense.vendor && (
            <span className="text-xs text-muted-foreground truncate hidden sm:inline">
              {expense.vendor}
            </span>
          )}
          <span className="ml-auto font-semibold tabular-nums shrink-0">
            {expense.amount.toFixed(2)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => setIsEditOpen(true)}
            aria-label={t("expenses.editExpense")}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
            onClick={() => setIsDeleteOpen(true)}
            aria-label={t("expenses.deleteExpense")}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {isEditOpen && (
          <EditExpenseDialog
            expense={expense}
            monthId={monthId}
            open={isEditOpen}
            onOpenChange={setIsEditOpen}
          />
        )}

        <DeleteExpenseDialog
          expenseId={expense.id}
          expenseName={expense.itemName}
          monthId={monthId}
          open={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
        />
      </>
    );
  }

  return (
    <>
      <Card className={cn(isPlanned && "opacity-60")}>
        <CardContent className="flex items-center justify-between gap-4 py-3">
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{expense.itemName}</span>
              <span className="text-xs text-muted-foreground shrink-0">
                {expense.categoryName}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{expense.expenseDate}</span>
              {isPlanned && (
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                  {t("months.plannedSpent")}
                </span>
              )}
              {expense.vendor && (
                <>
                  <span>·</span>
                  <span className="truncate">{expense.vendor}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-semibold tabular-nums">
              {expense.amount.toFixed(2)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 min-h-11 min-w-11 md:min-h-0 md:min-w-0"
              onClick={() => setIsEditOpen(true)}
              aria-label={t("expenses.editExpense")}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 min-h-11 min-w-11 md:min-h-0 md:min-w-0 text-destructive hover:text-destructive"
              onClick={() => setIsDeleteOpen(true)}
              aria-label={t("expenses.deleteExpense")}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {isEditOpen && (
        <EditExpenseDialog
          expense={expense}
          monthId={monthId}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
        />
      )}

      <DeleteExpenseDialog
        expenseId={expense.id}
        expenseName={expense.itemName}
        monthId={monthId}
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
      />
    </>
  );
}
