import { useState } from "react";
import { Platform, Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";
import { ArchiveRestore, Pencil, Trash2 } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import type { Category } from "@shared/types/category";
import { useUpdateCategory } from "../hooks/useCategories";
import { EditCategoryDialog } from "./EditCategoryDialog";
import { DeleteCategoryDialog } from "./DeleteCategoryDialog";
import { CategoryExpensesDialog } from "./CategoryExpensesDialog";

interface CategoryCardProps {
  category: Category;
}

export function CategoryCard({ category }: CategoryCardProps) {
  const { t } = useTranslation();
  const updateCategory = useUpdateCategory();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isExpensesOpen, setIsExpensesOpen] = useState(false);

  function handleUnarchive() {
    updateCategory.mutate({
      id: category.id,
      request: { isArchived: false },
    });
  }

  return (
    <>
      <Pressable
        onPress={() => setIsExpensesOpen(true)}
        // On web role="button" renders a <button>, which can't contain the edit/delete buttons.
        accessibilityRole={Platform.OS === "web" ? undefined : "button"}
        accessibilityLabel={category.name}
      >
        <Card
          className={cn(
            "gap-0 py-0 active:bg-muted/50 web:transition-colors web:hover:bg-muted/50",
            category.isArchived && "opacity-60",
          )}
        >
          <CardContent className="flex-row items-center justify-between gap-2 px-3 py-2">
            <Text numberOfLines={1} className="flex-1 text-sm font-medium">
              {category.name}
            </Text>
            <View className="flex-row items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 md:h-7 md:w-7"
                hitSlop={6}
                onPress={() => setIsEditOpen(true)}
                aria-label={t("categories.editCategory")}
              >
                <Icon as={Pencil} size={14} />
              </Button>
              {category.isArchived ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 md:h-7 md:w-7"
                  hitSlop={6}
                  onPress={handleUnarchive}
                  disabled={updateCategory.isPending}
                  aria-label={t("categories.active")}
                >
                  <Icon as={ArchiveRestore} size={14} />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 md:h-7 md:w-7"
                  textClassName="text-destructive"
                  hitSlop={6}
                  onPress={() => setIsDeleteOpen(true)}
                  aria-label={t("categories.deleteCategory")}
                >
                  <Icon as={Trash2} size={14} />
                </Button>
              )}
            </View>
          </CardContent>
        </Card>
      </Pressable>

      {isExpensesOpen && (
        <CategoryExpensesDialog
          category={category}
          open={isExpensesOpen}
          onOpenChange={setIsExpensesOpen}
        />
      )}

      {isEditOpen && (
        <EditCategoryDialog category={category} open={isEditOpen} onOpenChange={setIsEditOpen} />
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
