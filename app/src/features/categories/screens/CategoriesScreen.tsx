import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import { LoadingScreen } from "@/components/ui/spinner";
import { useCategories } from "../hooks/useCategories";
import { CategoryCard } from "../components/CategoryCard";
import { CreateCategoryDialog } from "../components/CreateCategoryDialog";

export function CategoriesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: categories, isLoading, error, refetch } = useCategories();
  const [isShowingArchived, setIsShowingArchived] = useState(false);

  const visibleCategories = useMemo(() => {
    if (!categories) return [];
    return isShowingArchived ? categories : categories.filter((c) => !c.isArchived);
  }, [categories, isShowingArchived]);

  const archivedCount = useMemo(() => {
    if (!categories) return 0;
    return categories.filter((c) => c.isArchived).length;
  }, [categories]);

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace("/settings");
  }

  if (isLoading) {
    return (
      <LoadingScreen />
    );
  }

  if (error) {
    return (
      <Screen onRefresh={refetch}>
        <Text className="text-destructive">{t("common.error")}</Text>
      </Screen>
    );
  }

  return (
    <Screen onRefresh={refetch}>
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          hitSlop={12}
          className="web:hover:opacity-70"
        >
          <Icon as={ArrowLeft} size={20} className="text-muted-foreground" />
        </Pressable>
        <Text role="heading" className="flex-1 text-2xl font-bold">
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
