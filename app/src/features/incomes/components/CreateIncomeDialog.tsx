import { useState } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { TrendingUp } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import { MoneyInput } from "@/components/shared/MoneyInput";
import { parseDecimalInput, todayIso } from "@/lib/format";
import { useCreateIncome } from "../hooks/useIncomes";

interface CreateIncomeDialogProps {
  monthId: string;
}

export function CreateIncomeDialog({ monthId }: CreateIncomeDialogProps) {
  const { t } = useTranslation();
  const createIncome = useCreateIncome(monthId);
  const [isOpen, setIsOpen] = useState(false);
  const [source, setSource] = useState("");
  const [amount, setAmount] = useState("");
  const [incomeDate, setIncomeDate] = useState(todayIso());
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setSource("");
    setAmount("");
    setIncomeDate(todayIso());
    setComment("");
    setError(null);
  }

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
      await createIncome.mutateAsync({
        source: source.trim(),
        amount: amountNum,
        incomeDate,
        comment: comment.trim() || undefined,
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
        className="border-green-300"
        textClassName="text-green-700"
        onPress={() => setIsOpen(true)}
      >
        <Icon as={TrendingUp} />
        <Text>{t("incomes.income")}</Text>
      </Button>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) resetForm();
        }}
        title={t("incomes.addIncome")}
      >
        <View className="gap-2">
          <Label nativeID="source-label">{t("incomes.source")}</Label>
          <Input aria-labelledby="source-label" value={source} onChangeText={setSource} returnKeyType="next" />
        </View>
        <View className="flex-row gap-4">
          <View className="min-w-0 flex-1 gap-2">
            <Label nativeID="income-amount-label">{t("incomes.amount")}</Label>
            <MoneyInput aria-labelledby="income-amount-label" value={amount} onChange={setAmount} />
          </View>
          <View className="min-w-0 flex-1 gap-2">
            <Label>{t("incomes.date")}</Label>
            <DateInput value={incomeDate} onChange={setIncomeDate} accessibilityLabel={t("incomes.date")} />
          </View>
        </View>
        <View className="gap-2">
          <Label nativeID="income-comment-label">{t("incomes.comment")}</Label>
          <Input
            aria-labelledby="income-comment-label"
            value={comment}
            onChangeText={setComment}
            returnKeyType="done"
            onSubmitEditing={() => void handleSubmit()}
          />
        </View>
        {error && <Text className="text-sm text-destructive">{error}</Text>}
        <Button onPress={() => void handleSubmit()} loading={createIncome.isPending}>
          {t("common.save")}
        </Button>
      </Dialog>
    </>
  );
}
