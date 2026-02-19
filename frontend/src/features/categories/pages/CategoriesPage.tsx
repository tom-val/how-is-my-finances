import { useTranslation } from "react-i18next";
import { useCategories } from "../hooks/useCategories";
import { CategoryCard } from "../components/CategoryCard";
import { CreateCategoryDialog } from "../components/CreateCategoryDialog";

export function CategoriesPage() {
  const { t } = useTranslation();
  const { data: categories, isLoading, error } = useCategories();

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
      {categories && categories.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
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
