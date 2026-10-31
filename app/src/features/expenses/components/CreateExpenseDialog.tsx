import { useState } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { TrendingDown } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { MoneyInput } from "@/components/shared/MoneyInput";
import { parseDecimalInput, todayIso } from "@/lib/format";
import { useCreateExpense, useVendors } from "../hooks/useExpenses";
import { useCategories } from "@/features/categories/hooks/useCategories";
import { VendorCombobox } from "./VendorCombobox";
import { CategoryCombobox } from "./CategoryCombobox";

interface CreateExpenseDialogProps {
  monthId: string;
}

export function CreateExpenseDialog({ monthId }: CreateExpenseDialogProps) {
  const { t } = useTranslation();
  const createExpense = useCreateExpense(monthId);
  const { data: categories } = useCategories();
  const { data: vendors } = useVendors();
  const [isOpen, setIsOpen] = useState(false);
  const [itemName, setItemName] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [expenseDate, setExpenseDate] = useState(todayIso());
  const [vendor, setVendor] = useState("");
  const [comment, setComment] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setItemName("");
    setAmount("");
    setCategoryId("");
    setExpenseDate(todayIso());
    setVendor("");
    setComment("");
    setIsPending(false);
    setError(null);
  }

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

    if (!categoryId) {
      setError("Category is required");
      return;
    }

    try {
      await createExpense.mutateAsync({
        itemName: itemName.trim(),
        amount: amountNum,
        categoryId,
        expenseDate,
        vendor: vendor.trim() || undefined,
        comment: comment.trim() || undefined,
        isCompleted: !isPending,
      });
      resetForm();
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="border-red-300"
        textClassName="text-red-700"
        onPress={() => setIsOpen(true)}
      >
        <Icon as={TrendingDown} />
        <Text>{t("expenses.expense")}</Text>
      </Button>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) resetForm();
        }}
        title={t("expenses.addExpense")}
      >
        <View className="gap-2">
          <Label nativeID="itemName-label">{t("expenses.itemName")}</Label>
          <Input
            aria-labelledby="itemName-label"
            value={itemName}
            onChangeText={setItemName}
            autoComplete="off"
            returnKeyType="next"
          />
        </View>
        <View className="flex-row gap-4">
          <View className="min-w-0 flex-1 gap-2">
            <Label nativeID="amount-label">{t("expenses.amount")}</Label>
            <MoneyInput aria-labelledby="amount-label" value={amount} onChange={setAmount} />
          </View>
          <View className="min-w-0 flex-1 gap-2">
            <Label>{t("expenses.date")}</Label>
            <DateInput value={expenseDate} onChange={setExpenseDate} accessibilityLabel={t("expenses.date")} />
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
          <Label nativeID="comment-label">{t("expenses.comment")}</Label>
          <Input
            aria-labelledby="comment-label"
            value={comment}
            onChangeText={setComment}
            returnKeyType="done"
            onSubmitEditing={() => void handleSubmit()}
          />
        </View>
        <View className="flex-row items-center justify-between gap-2">
          <View className="flex-1 gap-1">
            <Label>{t("expenses.pendingPayment")}</Label>
            <Text className="text-xs text-muted-foreground">{t("expenses.pendingPaymentDescription")}</Text>
          </View>
          <Switch
            checked={isPending}
            onCheckedChange={setIsPending}
            accessibilityLabel={t("expenses.pendingPayment")}
          />
        </View>
        {error && <Text className="text-sm text-destructive">{error}</Text>}
        <Button onPress={() => void handleSubmit()} loading={createExpense.isPending}>
          {t("common.save")}
        </Button>
      </Dialog>
    </>
  );
}
