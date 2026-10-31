import { useState } from "react";
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
import { useUpdateIncome } from "../hooks/useIncomes";
import type { Income } from "@shared/types/income";

interface EditIncomeDialogProps {
  income: Income;
  monthId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditIncomeDialog({ income, monthId, open, onOpenChange }: EditIncomeDialogProps) {
  const { t } = useTranslation();
  const updateIncome = useUpdateIncome(monthId);
  const [source, setSource] = useState(income.source);
  const [amount, setAmount] = useState(income.amount.toString());
  const [incomeDate, setIncomeDate] = useState(income.incomeDate);
  const [comment, setComment] = useState(income.comment ?? "");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);

    if (!source.trim()) {
      setError("Source is required");
      return;
    }

    const amountNum = parseDecimalInput(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Amount must be greater than zero");
      return;
    }

    try {
      await updateIncome.mutateAsync({
        id: income.id,
        request: {
          source: source.trim(),
          amount: amountNum,
          incomeDate,
          comment: comment.trim() || undefined,
        },
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t("incomes.editIncome")}>
      <View className="gap-2">
        <Label nativeID="edit-source-label">{t("incomes.source")}</Label>
        <Input
          aria-labelledby="edit-source-label"
          value={source}
          onChangeText={setSource}
          returnKeyType="next"
        />
      </View>
      <View className="flex-row gap-4">
        <View className="min-w-0 flex-1 gap-2">
          <Label nativeID="edit-income-amount-label">{t("incomes.amount")}</Label>
          <MoneyInput aria-labelledby="edit-income-amount-label" value={amount} onChange={setAmount} />
        </View>
        <View className="min-w-0 flex-1 gap-2">
          <Label>{t("incomes.date")}</Label>
          <DateInput value={incomeDate} onChange={setIncomeDate} accessibilityLabel={t("incomes.date")} />
        </View>
      </View>
      <View className="gap-2">
        <Label nativeID="edit-income-comment-label">{t("incomes.comment")}</Label>
        <Input
          aria-labelledby="edit-income-comment-label"
          value={comment}
          onChangeText={setComment}
          returnKeyType="done"
          onSubmitEditing={() => void handleSubmit()}
        />
      </View>
      {error && <Text className="text-sm text-destructive">{error}</Text>}
      <Button onPress={() => void handleSubmit()} loading={updateIncome.isPending}>
        {t("common.save")}
      </Button>
    </Dialog>
  );
}
