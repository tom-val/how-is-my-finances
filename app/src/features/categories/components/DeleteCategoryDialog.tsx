import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Text } from "@/components/ui/text";
import { ApiError } from "@/api/client";
import { updateCategory } from "@/api/categories";
import { useDeleteCategory } from "../hooks/useCategories";

interface DeleteCategoryDialogProps {
  categoryId: string;
  categoryName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteCategoryDialog({
  categoryId,
  categoryName,
  open,
  onOpenChange,
}: DeleteCategoryDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const deleteCategory = useDeleteCategory();
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    try {
      await deleteCategory.mutateAsync(categoryId);
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        await updateCategory(categoryId, { isArchived: true });
        await queryClient.invalidateQueries({ queryKey: ["categories"] });
        onOpenChange(false);
        return;
      }
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("categories.deleteCategory")}
      description={t("categories.confirmDelete")}
      confirmLabel={t("common.delete")}
      cancelLabel={t("common.cancel")}
      onConfirm={() => void handleDelete()}
      destructive
      isPending={deleteCategory.isPending}
    >
      <Text className="text-sm font-medium">{categoryName}</Text>
      {error && <Text className="text-sm text-destructive">{error}</Text>}
    </ConfirmDialog>
  );
}
