import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import type { RecurringExpenseWithCategory } from "@shared/types/recurringExpense";
import { EditRecurringExpenseDialog } from "./EditRecurringExpenseDialog";
import { DeleteRecurringExpenseDialog } from "./DeleteRecurringExpenseDialog";
import { useUpdateRecurringExpense } from "../hooks/useRecurringExpenses";

interface RecurringExpenseCardProps {
  recurringExpense: RecurringExpenseWithCategory;
}

export function RecurringExpenseCard({
  recurringExpense,
}: RecurringExpenseCardProps) {
  const { t } = useTranslation();
  const updateRecurring = useUpdateRecurringExpense();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  function handleToggleActive() {
    updateRecurring.mutate({
      id: recurringExpense.id,
      request: { isActive: !recurringExpense.isActive },
    });
  }

  return (
    <>
      <Card
        className={`py-0 gap-0 ${!recurringExpense.isActive ? "opacity-60" : ""}`}
      >
        <CardContent className="flex items-center justify-between gap-2 px-3 py-2">
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm font-medium truncate">
              {recurringExpense.itemName}
            </span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{recurringExpense.categoryName}</span>
              <span>·</span>
              <span>
                {recurringExpense.amount.toFixed(2)} EUR
              </span>
              <span>·</span>
              <span>
                {t("recurring.dayOfMonth")} {recurringExpense.dayOfMonth}
              </span>
              {recurringExpense.isManual && (
                <>
                  <span>·</span>
                  <span className="rounded bg-orange-100 px-1 py-0.5 text-[10px] font-medium text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                    {t("recurring.isManual")}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Switch
              checked={recurringExpense.isActive}
              onCheckedChange={handleToggleActive}
              disabled={updateRecurring.isPending}
              aria-label={
                recurringExpense.isActive
                  ? t("recurring.active")
                  : t("recurring.inactive")
              }
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsEditOpen(true)}
              aria-label={t("recurring.editRecurring")}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => setIsDeleteOpen(true)}
              aria-label={t("recurring.deleteRecurring")}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {isEditOpen && (
        <EditRecurringExpenseDialog
          recurringExpense={recurringExpense}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
        />
      )}

      <DeleteRecurringExpenseDialog
        recurringExpenseId={recurringExpense.id}
        recurringExpenseName={recurringExpense.itemName}
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
      />
    </>
  );
}
