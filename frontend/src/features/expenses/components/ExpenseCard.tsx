import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Circle, CheckCircle2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ExpenseWithCategory } from "@shared/types/expense";
import { EditExpenseDialog } from "./EditExpenseDialog";
import { DeleteExpenseDialog } from "./DeleteExpenseDialog";
import { useToggleExpenseComplete } from "../hooks/useExpenses";

interface ExpenseCardProps {
  expense: ExpenseWithCategory;
  monthId: string;
}

function isPlannedExpense(expenseDate: string): boolean {
  return expenseDate > new Date().toISOString().split("T")[0];
}

export function ExpenseCard({ expense, monthId }: ExpenseCardProps) {
  const { t } = useTranslation();
  const toggleComplete = useToggleExpenseComplete(monthId);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const isPlanned = isPlannedExpense(expense.expenseDate);
  const isIncomplete = !expense.isCompleted;

  function handleToggleComplete() {
    toggleComplete.mutate(expense.id);
  }

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-3 rounded-md border px-3 py-1.5 text-sm hover:bg-muted/50",
          isPlanned && "opacity-60",
          isIncomplete && "border-dashed border-orange-300 dark:border-orange-700",
        )}
      >
        <button
          type="button"
          onClick={handleToggleComplete}
          disabled={toggleComplete.isPending}
          className={cn(
            "shrink-0 transition-colors",
            isIncomplete
              ? "text-orange-500 hover:text-green-600"
              : "text-green-600 hover:text-orange-500",
          )}
          aria-label={isIncomplete ? t("expenses.markAsCompleted") : t("expenses.markAsIncomplete")}
        >
          {isIncomplete ? (
            <Circle className="h-4 w-4" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
        </button>
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
