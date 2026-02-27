import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { TrendingUp } from "lucide-react";
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
  ResponsiveDialogTrigger,
} from "@/components/shared/ResponsiveDialog";
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
  const [incomeDate, setIncomeDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setSource("");
    setAmount("");
    setIncomeDate(new Date().toISOString().split("T")[0]);
    setComment("");
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

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
    <ResponsiveDialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) resetForm();
      }}
    >
      <ResponsiveDialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="border-green-300 text-green-700 hover:bg-green-50 hover:text-green-800"
        >
          <TrendingUp className="h-4 w-4" />
          {t("incomes.income")}
        </Button>
      </ResponsiveDialogTrigger>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {t("incomes.addIncome")}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="source">{t("incomes.source")}</Label>
            <Input
              id="source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="income-amount">{t("incomes.amount")}</Label>
              <MoneyInput
                id="income-amount"
                value={amount}
                onChange={setAmount}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="incomeDate">{t("incomes.date")}</Label>
              <Input
                id="incomeDate"
                type="date"
                value={incomeDate}
                onChange={(e) => setIncomeDate(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="income-comment">{t("incomes.comment")}</Label>
            <Input
              id="income-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={createIncome.isPending}>
            {createIncome.isPending ? t("common.loading") : t("common.save")}
          </Button>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
