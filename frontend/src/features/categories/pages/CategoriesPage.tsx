import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useCategories } from "../hooks/useCategories";
import { CategoryCard } from "../components/CategoryCard";
import { CreateCategoryDialog } from "../components/CreateCategoryDialog";

export function CategoriesPage() {
  const { t } = useTranslation();
  const { data: categories, isLoading, error } = useCategories();
  const [isShowingArchived, setIsShowingArchived] = useState(false);

  const visibleCategories = useMemo(() => {
    if (!categories) return [];
    return isShowingArchived
      ? categories
      : categories.filter((c) => !c.isArchived);
  }, [categories, isShowingArchived]);

  const archivedCount = useMemo(() => {
    if (!categories) return 0;
    return categories.filter((c) => c.isArchived).length;
  }, [categories]);

  if (isLoading) {
    return <p className="text-muted-foreground">{t("common.loading")}</p>;
  }

  if (error) {
    return <p className="text-destructive">{t("common.error")}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("categories.title")}</h1>
        <CreateCategoryDialog />
      </div>
      {archivedCount > 0 && (
        <div className="flex">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsShowingArchived(!isShowingArchived)}
          >
            {isShowingArchived
              ? t("categories.hideArchived")
              : t("categories.showArchived", { count: archivedCount })}
          </Button>
        </div>
      )}
      {visibleCategories.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {visibleCategories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">
          {t("categories.noCategories")}
        </p>
      )}
    </div>
  );
}
