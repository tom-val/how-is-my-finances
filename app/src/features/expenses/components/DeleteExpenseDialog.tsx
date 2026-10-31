import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Text } from "@/components/ui/text";
import { useDeleteExpense } from "../hooks/useExpenses";

interface DeleteExpenseDialogProps {
  expenseId: string;
  expenseName: string;
  monthId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteExpenseDialog({
  expenseId,
  expenseName,
  monthId,
  open,
  onOpenChange,
}: DeleteExpenseDialogProps) {
  const { t } = useTranslation();
  const deleteExpense = useDeleteExpense(monthId);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    try {
      await deleteExpense.mutateAsync(expenseId);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("expenses.deleteExpense")}
      description={t("expenses.confirmDelete")}
      confirmLabel={t("common.delete")}
      cancelLabel={t("common.cancel")}
      onConfirm={() => void handleDelete()}
      isPending={deleteExpense.isPending}
      destructive
    >
      <Text className="text-sm font-medium">{expenseName}</Text>
      {error && <Text className="text-sm text-destructive">{error}</Text>}
    </ConfirmDialog>
  );
}
