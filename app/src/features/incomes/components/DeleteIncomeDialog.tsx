import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Text } from "@/components/ui/text";
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
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("incomes.deleteIncome")}
      description={t("incomes.confirmDelete")}
      confirmLabel={t("common.delete")}
      cancelLabel={t("common.cancel")}
      onConfirm={() => void handleDelete()}
      isPending={deleteIncome.isPending}
      destructive
    >
      <Text className="text-sm font-medium">{incomeSource}</Text>
      {error && <Text className="text-sm text-destructive">{error}</Text>}
    </ConfirmDialog>
  );
}
