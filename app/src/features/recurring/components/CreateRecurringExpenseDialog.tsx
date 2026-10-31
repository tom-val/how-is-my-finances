import { useState } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { MoneyInput } from "@/components/shared/MoneyInput";
import { parseDecimalInput } from "@/lib/format";
import { useCreateRecurringExpense } from "../hooks/useRecurringExpenses";
import { useCategories } from "@/features/categories/hooks/useCategories";
import { CategoryCombobox } from "@/features/expenses/components/CategoryCombobox";
import { VendorCombobox } from "@/features/expenses/components/VendorCombobox";
import { useVendors } from "@/features/expenses/hooks/useExpenses";

export function CreateRecurringExpenseDialog() {
  const { t } = useTranslation();
  const createRecurring = useCreateRecurringExpense();
  const { data: categories } = useCategories();
  const { data: vendors } = useVendors();
  const [isOpen, setIsOpen] = useState(false);
  const [itemName, setItemName] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [vendor, setVendor] = useState("");
  const [comment, setComment] = useState("");
  const [isManual, setIsManual] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setItemName("");
    setAmount("");
    setCategoryId("");
    setDayOfMonth("1");
    setVendor("");
    setComment("");
    setIsManual(false);
    setError(null);
  }

  async function handleSubmit() {
    setError(null);

    const amountNum = parseDecimalInput(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError(t("recurring.amountRequired"));
      return;
    }

    if (!categoryId) {
      setError(t("recurring.categoryRequired"));
      return;
    }

    const dayNum = parseInt(dayOfMonth, 10);
    if (isNaN(dayNum) || dayNum < 1 || dayNum > 28) {
      setError(t("recurring.dayOfMonthHint"));
      return;
    }

    try {
      await createRecurring.mutateAsync({
        itemName: itemName.trim(),
        amount: amountNum,
        categoryId,
        dayOfMonth: dayNum,
        vendor: vendor.trim() || undefined,
        comment: comment.trim() || undefined,
        isManual,
      });
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
        <Text>{t("recurring.addRecurring")}</Text>
      </Button>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) resetForm();
        }}
        title={t("recurring.addRecurring")}
      >
        <View className="gap-2">
          <Label nativeID="recurringItemName-label">{t("expenses.itemName")}</Label>
          <Input
            aria-labelledby="recurringItemName-label"
            value={itemName}
            onChangeText={setItemName}
            autoComplete="off"
          />
        </View>
        <View className="flex-row gap-4">
          <View className="min-w-0 flex-1 gap-2">
            <Label nativeID="recurringAmount-label">{t("expenses.amount")}</Label>
            <MoneyInput
              aria-labelledby="recurringAmount-label"
              value={amount}
              onChange={setAmount}
            />
          </View>
          <View className="min-w-0 flex-1 gap-2">
            <Label nativeID="recurringDayOfMonth-label">{t("recurring.dayOfMonth")}</Label>
            <Input
              aria-labelledby="recurringDayOfMonth-label"
              keyboardType="number-pad"
              inputMode="numeric"
              maxLength={2}
              value={dayOfMonth}
              onChangeText={setDayOfMonth}
            />
          </View>
        </View>
        <View className="gap-2">
          <Label>{t("expenses.category")}</Label>
          <CategoryCombobox
            value={categoryId}
            onChange={setCategoryId}
            categories={(categories ?? []).filter((c) => !c.isArchived)}
          />
        </View>
        <View className="gap-2">
          <Label>{t("expenses.vendor")}</Label>
          <VendorCombobox value={vendor} onChange={setVendor} vendors={vendors ?? []} />
        </View>
        <View className="gap-2">
          <Label nativeID="recurringComment-label">{t("expenses.comment")}</Label>
          <Input
            aria-labelledby="recurringComment-label"
            value={comment}
            onChangeText={setComment}
          />
        </View>
        <View className="flex-row items-center justify-between gap-2">
          <View className="flex-1">
            <Label>{t("recurring.isManual")}</Label>
            <Text className="text-xs text-muted-foreground">
              {t("recurring.isManualDescription")}
            </Text>
          </View>
          <Switch
            checked={isManual}
            onCheckedChange={setIsManual}
            accessibilityLabel={t("recurring.isManual")}
          />
        </View>
        {error && <Text className="text-sm text-destructive">{error}</Text>}
        <Button onPress={() => void handleSubmit()} loading={createRecurring.isPending}>
          {t("common.save")}
        </Button>
      </Dialog>
    </>
  );
}
