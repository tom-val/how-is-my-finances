import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/shared/ResponsiveDialog";
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
  const deleteCategory = useDeleteCategory();
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    try {
      await deleteCategory.mutateAsync(categoryId);
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
            {t("categories.deleteCategory")}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {t("categories.confirmDelete")}
          </p>
          <p className="text-sm font-medium">{categoryName}</p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={deleteCategory.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteCategory.isPending}
            >
              {deleteCategory.isPending
                ? t("common.loading")
                : t("common.delete")}
            </Button>
          </div>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
