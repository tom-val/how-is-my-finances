import { useState } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import { useUpdateCategory } from "../hooks/useCategories";
import type { Category } from "@shared/types/category";

interface EditCategoryDialogProps {
  category: Category;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditCategoryDialog({ category, open, onOpenChange }: EditCategoryDialogProps) {
  const { t } = useTranslation();
  const updateCategory = useUpdateCategory();
  const [name, setName] = useState(category.name);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);

    const trimmed = name.trim();
    if (!trimmed) {
      setError(t("categories.nameRequired"));
      return;
    }

    try {
      await updateCategory.mutateAsync({
        id: category.id,
        request: { name: trimmed },
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t("categories.editCategory")}>
      <View className="gap-2">
        <Label nativeID="edit-categoryName-label">{t("categories.name")}</Label>
        <Input
          aria-labelledby="edit-categoryName-label"
          value={name}
          onChangeText={setName}
          returnKeyType="done"
          onSubmitEditing={() => void handleSubmit()}
        />
      </View>
      {error && <Text className="text-sm text-destructive">{error}</Text>}
      <Button onPress={() => void handleSubmit()} loading={updateCategory.isPending}>
        {t("common.save")}
      </Button>
    </Dialog>
  );
}
