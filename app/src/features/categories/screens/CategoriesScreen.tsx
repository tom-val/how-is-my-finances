import { useMemo, useState } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import { useCategories } from "../hooks/useCategories";
import { CategoryCard } from "../components/CategoryCard";
import { CreateCategoryDialog } from "../components/CreateCategoryDialog";

export function CategoriesScreen() {
  const { t } = useTranslation();
  const { data: categories, isLoading, error, refetch, isRefetching } = useCategories();
  const [isShowingArchived, setIsShowingArchived] = useState(false);

  const visibleCategories = useMemo(() => {
    if (!categories) return [];
    return isShowingArchived ? categories : categories.filter((c) => !c.isArchived);
  }, [categories, isShowingArchived]);

  const archivedCount = useMemo(() => {
    if (!categories) return 0;
    return categories.filter((c) => c.isArchived).length;
  }, [categories]);

  if (isLoading) {
    return (
      <Screen>
        <Text className="text-muted-foreground">{t("common.loading")}</Text>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen onRefresh={() => void refetch()} refreshing={isRefetching}>
        <Text className="text-destructive">{t("common.error")}</Text>
      </Screen>
    );
  }

  return (
    <Screen onRefresh={() => void refetch()} refreshing={isRefetching}>
      <View className="flex-row items-center justify-between gap-2">
        <Text role="heading" className="text-2xl font-bold">
          {t("categories.title")}
        </Text>
        <CreateCategoryDialog />
      </View>
      {archivedCount > 0 && (
        <View className="flex-row">
          <Button variant="ghost" size="sm" onPress={() => setIsShowingArchived(!isShowingArchived)}>
            {isShowingArchived
              ? t("categories.hideArchived")
              : t("categories.showArchived", { count: archivedCount })}
          </Button>
        </View>
      )}
      {visibleCategories.length > 0 ? (
        <View className="-m-1 flex-row flex-wrap">
          {visibleCategories.map((category) => (
            <View key={category.id} className="w-full p-1 sm:w-1/2 lg:w-1/3">
              <CategoryCard category={category} />
            </View>
          ))}
        </View>
      ) : (
        <Text className="text-muted-foreground">{t("categories.noCategories")}</Text>
      )}
    </Screen>
  );
}
