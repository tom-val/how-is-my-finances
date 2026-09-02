import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Income } from "@shared/types/income";
import { EditIncomeDialog } from "./EditIncomeDialog";
import { DeleteIncomeDialog } from "./DeleteIncomeDialog";

interface IncomeCardProps {
  income: Income;
  monthId: string;
}

export function IncomeCard({ income, monthId }: IncomeCardProps) {
  const { t } = useTranslation();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-3 rounded-md border px-3 py-1.5 text-sm hover:bg-muted/50">
        <span className="font-medium truncate min-w-0 shrink">
          {income.source}
        </span>
        <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">
          {income.incomeDate}
        </span>
        {income.comment && (
          <span className="text-xs text-muted-foreground truncate hidden sm:inline">
            {income.comment}
          </span>
        )}
        <span className="ml-auto font-semibold tabular-nums shrink-0 text-green-600 dark:text-green-400">
          +{income.amount.toFixed(2)}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={() => setIsEditOpen(true)}
          aria-label={t("incomes.editIncome")}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
          onClick={() => setIsDeleteOpen(true)}
          aria-label={t("incomes.deleteIncome")}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {isEditOpen && (
        <EditIncomeDialog
          income={income}
          monthId={monthId}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
        />
      )}

      <DeleteIncomeDialog
        incomeId={income.id}
        incomeSource={income.source}
        monthId={monthId}
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
      />
    </>
  );
}
