import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
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
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setItemName("");
    setAmount("");
    setCategoryId("");
    setDayOfMonth("1");
    setVendor("");
    setComment("");
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
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
        <Button size="sm">
          <Plus className="h-4 w-4" />
          {t("recurring.addRecurring")}
        </Button>
      </ResponsiveDialogTrigger>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {t("recurring.addRecurring")}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="recurringItemName">{t("expenses.itemName")}</Label>
            <Input
              id="recurringItemName"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              required
              autoComplete="off"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex min-w-0 flex-col gap-2">
              <Label htmlFor="recurringAmount">{t("expenses.amount")}</Label>
              <MoneyInput
                id="recurringAmount"
                value={amount}
                onChange={setAmount}
                required
              />
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <Label htmlFor="recurringDayOfMonth">
                {t("recurring.dayOfMonth")}
              </Label>
              <Input
                id="recurringDayOfMonth"
                type="number"
                inputMode="numeric"
                min="1"
                max="28"
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label>{t("expenses.category")}</Label>
            <CategoryCombobox
              value={categoryId}
              onChange={setCategoryId}
              categories={(categories ?? []).filter((c) => !c.isArchived)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>{t("expenses.vendor")}</Label>
            <VendorCombobox
              value={vendor}
              onChange={setVendor}
              vendors={vendors ?? []}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="recurringComment">{t("expenses.comment")}</Label>
            <Input
              id="recurringComment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={createRecurring.isPending}>
            {createRecurring.isPending
              ? t("common.loading")
              : t("common.save")}
          </Button>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
