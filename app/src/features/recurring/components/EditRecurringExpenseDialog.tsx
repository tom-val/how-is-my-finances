import { useMemo, useState } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { MoneyInput } from "@/components/shared/MoneyInput";
import { parseDecimalInput } from "@/lib/format";
import { useUpdateRecurringExpense } from "../hooks/useRecurringExpenses";
import { useCategories } from "@/features/categories/hooks/useCategories";
import { CategoryCombobox } from "@/features/expenses/components/CategoryCombobox";
import { VendorCombobox } from "@/features/expenses/components/VendorCombobox";
import { useVendors } from "@/features/expenses/hooks/useExpenses";
import type { RecurringExpenseWithCategory } from "@shared/types/recurringExpense";

interface EditRecurringExpenseDialogProps {
  recurringExpense: RecurringExpenseWithCategory;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditRecurringExpenseDialog({
  recurringExpense,
  open,
  onOpenChange,
}: EditRecurringExpenseDialogProps) {
  const { t } = useTranslation();
  const updateRecurring = useUpdateRecurringExpense();
  const { data: categories } = useCategories();
  const { data: vendors } = useVendors();
  const [itemName, setItemName] = useState(recurringExpense.itemName);
  const [amount, setAmount] = useState(recurringExpense.amount.toString());
  const [categoryId, setCategoryId] = useState(recurringExpense.categoryId);
  const [dayOfMonth, setDayOfMonth] = useState(recurringExpense.dayOfMonth.toString());
  const [vendor, setVendor] = useState(recurringExpense.vendor ?? "");
  const [comment, setComment] = useState(recurringExpense.comment ?? "");
  const [isManual, setIsManual] = useState(recurringExpense.isManual);
  const [error, setError] = useState<string | null>(null);

  const activeCategories = useMemo(
    () => (categories ?? []).filter((c) => !c.isArchived || c.id === categoryId),
    [categories, categoryId],
  );

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
      await updateRecurring.mutateAsync({
        id: recurringExpense.id,
        request: {
          itemName: itemName.trim(),
          amount: amountNum,
          categoryId,
          dayOfMonth: dayNum,
          vendor: vendor.trim() || undefined,
          comment: comment.trim() || undefined,
          isManual,
        },
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t("recurring.editRecurring")}>
      <View className="gap-2">
        <Label nativeID="edit-recurringItemName-label">{t("expenses.itemName")}</Label>
        <Input
          aria-labelledby="edit-recurringItemName-label"
          value={itemName}
          onChangeText={setItemName}
          autoComplete="off"
        />
      </View>
      <View className="flex-row gap-4">
        <View className="min-w-0 flex-1 gap-2">
          <Label nativeID="edit-recurringAmount-label">{t("expenses.amount")}</Label>
          <MoneyInput
            aria-labelledby="edit-recurringAmount-label"
            value={amount}
            onChange={setAmount}
          />
        </View>
        <View className="min-w-0 flex-1 gap-2">
          <Label nativeID="edit-recurringDayOfMonth-label">{t("recurring.dayOfMonth")}</Label>
          <Input
            aria-labelledby="edit-recurringDayOfMonth-label"
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
        <CategoryCombobox value={categoryId} onChange={setCategoryId} categories={activeCategories} />
      </View>
      <View className="gap-2">
        <Label>{t("expenses.vendor")}</Label>
        <VendorCombobox value={vendor} onChange={setVendor} vendors={vendors ?? []} />
      </View>
      <View className="gap-2">
        <Label nativeID="edit-recurringComment-label">{t("expenses.comment")}</Label>
        <Input
          aria-labelledby="edit-recurringComment-label"
          value={comment}
          onChangeText={setComment}
        />
      </View>
      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-1">
          <Label>{t("recurring.isManual")}</Label>
          <Text className="text-xs text-muted-foreground">{t("recurring.isManualDescription")}</Text>
        </View>
        <Switch
          checked={isManual}
          onCheckedChange={setIsManual}
          accessibilityLabel={t("recurring.isManual")}
        />
      </View>
      {error && <Text className="text-sm text-destructive">{error}</Text>}
      <Button onPress={() => void handleSubmit()} loading={updateRecurring.isPending}>
        {t("common.save")}
      </Button>
    </Dialog>
  );
}
