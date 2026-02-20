import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArchiveRestore, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Category } from "@shared/types/category";
import { useUpdateCategory } from "../hooks/useCategories";
import { EditCategoryDialog } from "./EditCategoryDialog";
import { DeleteCategoryDialog } from "./DeleteCategoryDialog";

interface CategoryCardProps {
  category: Category;
}

export function CategoryCard({ category }: CategoryCardProps) {
  const { t } = useTranslation();
  const updateCategory = useUpdateCategory();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  function handleUnarchive() {
    updateCategory.mutate({
      id: category.id,
      request: { isArchived: false },
    });
  }

  return (
    <>
      <Card
        className={`py-0 gap-0 ${category.isArchived ? "opacity-60" : ""}`}
      >
        <CardContent className="flex items-center justify-between gap-2 px-3 py-2">
          <span className="text-sm font-medium truncate">{category.name}</span>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsEditOpen(true)}
              aria-label={t("categories.editCategory")}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            {category.isArchived ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleUnarchive}
                disabled={updateCategory.isPending}
                aria-label={t("categories.active")}
              >
                <ArchiveRestore className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => setIsDeleteOpen(true)}
                aria-label={t("categories.deleteCategory")}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {isEditOpen && (
        <EditCategoryDialog
          category={category}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
        />
      )}

      <DeleteCategoryDialog
        categoryId={category.id}
        categoryName={category.name}
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
      />
    </>
  );
}
