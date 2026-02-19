import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/shared/ResponsiveDialog";
import { useDeleteIncome } from "../hooks/useIncomes";

interface DeleteIncomeDialogProps {
  incomeId: string;
  incomeSource: string;
  monthId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteIncomeDialog({
  incomeId,
  incomeSource,
  monthId,
  open,
  onOpenChange,
}: DeleteIncomeDialogProps) {
  const { t } = useTranslation();
  const deleteIncome = useDeleteIncome(monthId);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    try {
      await deleteIncome.mutateAsync(incomeId);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {t("incomes.deleteIncome")}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {t("incomes.confirmDelete")}
          </p>
          <p className="text-sm font-medium">{incomeSource}</p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={deleteIncome.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteIncome.isPending}
            >
              {deleteIncome.isPending
                ? t("common.loading")
                : t("common.delete")}
            </Button>
          </div>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
