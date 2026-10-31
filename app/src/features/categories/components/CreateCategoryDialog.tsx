import { useState } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import { useCreateCategory } from "../hooks/useCategories";

export function CreateCategoryDialog() {
  const { t } = useTranslation();
  const createCategory = useCreateCategory();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setName("");
    setError(null);
  }

  async function handleSubmit() {
    setError(null);

    const trimmed = name.trim();
    if (!trimmed) {
      setError(t("categories.nameRequired"));
      return;
    }

    try {
      await createCategory.mutateAsync({ name: trimmed });
      resetForm();
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  return (
    <>
      <Button size="sm" onPress={() => setIsOpen(true)}>
        <Icon as={Plus} />
        <Text>{t("categories.addCategory")}</Text>
      </Button>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) resetForm();
        }}
        title={t("categories.addCategory")}
      >
        <View className="gap-2">
          <Label nativeID="categoryName-label">{t("categories.name")}</Label>
          <Input
            aria-labelledby="categoryName-label"
            value={name}
            onChangeText={setName}
            returnKeyType="done"
            onSubmitEditing={() => void handleSubmit()}
          />
        </View>
        {error && <Text className="text-sm text-destructive">{error}</Text>}
        <Button onPress={() => void handleSubmit()} loading={createCategory.isPending}>
          {t("common.save")}
        </Button>
      </Dialog>
    </>
  );
}
