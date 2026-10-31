import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Text } from "@/components/ui/text";
import { useDeleteRecurringExpense } from "../hooks/useRecurringExpenses";

interface DeleteRecurringExpenseDialogProps {
  recurringExpenseId: string;
  recurringExpenseName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteRecurringExpenseDialog({
  recurringExpenseId,
  recurringExpenseName,
  open,
  onOpenChange,
}: DeleteRecurringExpenseDialogProps) {
  const { t } = useTranslation();
  const deleteRecurring = useDeleteRecurringExpense();
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    try {
      await deleteRecurring.mutateAsync(recurringExpenseId);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("recurring.deleteRecurring")}
      description={t("recurring.confirmDelete")}
      confirmLabel={t("common.delete")}
      cancelLabel={t("common.cancel")}
      onConfirm={() => void handleDelete()}
      destructive
      isPending={deleteRecurring.isPending}
    >
      <Text className="text-sm font-medium">{recurringExpenseName}</Text>
      {error && <Text className="text-sm text-destructive">{error}</Text>}
    </ConfirmDialog>
  );
}
