import { useMemo, useState } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import { MoneyInput } from "@/components/shared/MoneyInput";
import { parseDecimalInput } from "@/lib/format";
import { useUpdateExpense, useVendors } from "../hooks/useExpenses";
import { useCategories } from "@/features/categories/hooks/useCategories";
import { VendorCombobox } from "./VendorCombobox";
import { CategoryCombobox } from "./CategoryCombobox";
import type { ExpenseWithCategory } from "@shared/types/expense";

interface EditExpenseDialogProps {
  expense: ExpenseWithCategory;
  monthId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditExpenseDialog({ expense, monthId, open, onOpenChange }: EditExpenseDialogProps) {
  const { t } = useTranslation();
  const updateExpense = useUpdateExpense(monthId);
  const { data: categories } = useCategories();
  const { data: vendors } = useVendors();
  const [itemName, setItemName] = useState(expense.itemName);
  const [amount, setAmount] = useState(expense.amount.toString());
  const [categoryId, setCategoryId] = useState(expense.categoryId);
  const [expenseDate, setExpenseDate] = useState(expense.expenseDate);
  const [vendor, setVendor] = useState(expense.vendor ?? "");
  const [comment, setComment] = useState(expense.comment ?? "");
  const [error, setError] = useState<string | null>(null);

  const activeCategories = useMemo(
    () => (categories ?? []).filter((c) => !c.isArchived || c.id === categoryId),
    [categories, categoryId],
  );

  async function handleSubmit() {
    setError(null);

    if (!itemName.trim()) {
      setError("Item name is required");
      return;
    }

    const amountNum = parseDecimalInput(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Amount must be greater than zero");
      return;
    }

    try {
      await updateExpense.mutateAsync({
        id: expense.id,
        request: {
          itemName: itemName.trim(),
          amount: amountNum,
          categoryId,
          expenseDate,
          vendor: vendor.trim() || undefined,
          comment: comment.trim() || undefined,
        },
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t("expenses.editExpense")}>
      <View className="gap-2">
        <Label nativeID="edit-itemName-label">{t("expenses.itemName")}</Label>
        <Input
          aria-labelledby="edit-itemName-label"
          value={itemName}
          onChangeText={setItemName}
          autoComplete="off"
          returnKeyType="next"
        />
      </View>
      <View className="flex-row gap-4">
        <View className="min-w-0 flex-1 gap-2">
          <Label nativeID="edit-amount-label">{t("expenses.amount")}</Label>
          <MoneyInput aria-labelledby="edit-amount-label" value={amount} onChange={setAmount} />
        </View>
        <View className="min-w-0 flex-1 gap-2">
          <Label>{t("expenses.date")}</Label>
          <DateInput value={expenseDate} onChange={setExpenseDate} accessibilityLabel={t("expenses.date")} />
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
        <Label nativeID="edit-comment-label">{t("expenses.comment")}</Label>
        <Input
          aria-labelledby="edit-comment-label"
          value={comment}
          onChangeText={setComment}
          returnKeyType="done"
          onSubmitEditing={() => void handleSubmit()}
        />
      </View>
      {error && <Text className="text-sm text-destructive">{error}</Text>}
      <Button onPress={() => void handleSubmit()} loading={updateExpense.isPending}>
        {t("common.save")}
      </Button>
    </Dialog>
  );
}
