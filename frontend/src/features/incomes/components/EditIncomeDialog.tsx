import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/shared/MoneyInput";
import { parseDecimalInput } from "@/lib/format";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/shared/ResponsiveDialog";
import { useUpdateIncome } from "../hooks/useIncomes";
import type { Income } from "@shared/types/income";

interface EditIncomeDialogProps {
  income: Income;
  monthId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditIncomeDialog({
  income,
  monthId,
  open,
  onOpenChange,
}: EditIncomeDialogProps) {
  const { t } = useTranslation();
  const updateIncome = useUpdateIncome(monthId);
  const [source, setSource] = useState(income.source);
  const [amount, setAmount] = useState(income.amount.toString());
  const [incomeDate, setIncomeDate] = useState(income.incomeDate);
  const [comment, setComment] = useState(income.comment ?? "");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

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
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {t("incomes.editIncome")}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-source">{t("incomes.source")}</Label>
            <Input
              id="edit-source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-income-amount">
                {t("incomes.amount")}
              </Label>
              <MoneyInput
                id="edit-income-amount"
                value={amount}
                onChange={setAmount}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-incomeDate">{t("incomes.date")}</Label>
              <Input
                id="edit-incomeDate"
                type="date"
                value={incomeDate}
                onChange={(e) => setIncomeDate(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-income-comment">
              {t("incomes.comment")}
            </Label>
            <Input
              id="edit-income-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={updateIncome.isPending}>
            {updateIncome.isPending ? t("common.loading") : t("common.save")}
          </Button>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
