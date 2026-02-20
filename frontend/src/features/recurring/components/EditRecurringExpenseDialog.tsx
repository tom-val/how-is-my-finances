import { useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/shared/ResponsiveDialog";
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
  const [dayOfMonth, setDayOfMonth] = useState(
    recurringExpense.dayOfMonth.toString(),
  );
  const [vendor, setVendor] = useState(recurringExpense.vendor ?? "");
  const [comment, setComment] = useState(recurringExpense.comment ?? "");
  const [error, setError] = useState<string | null>(null);

  const activeCategories = useMemo(
    () =>
      (categories ?? []).filter(
        (c) => !c.isArchived || c.id === categoryId,
      ),
    [categories, categoryId],
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const amountNum = parseFloat(amount);
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
            {t("recurring.editRecurring")}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-recurringItemName">
              {t("expenses.itemName")}
            </Label>
            <Input
              id="edit-recurringItemName"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-recurringAmount">
                {t("expenses.amount")}
              </Label>
              <Input
                id="edit-recurringAmount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                placeholder="0.00"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-recurringDayOfMonth">
                {t("recurring.dayOfMonth")}
              </Label>
              <Input
                id="edit-recurringDayOfMonth"
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
              categories={activeCategories}
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
            <Label htmlFor="edit-recurringComment">
              {t("expenses.comment")}
            </Label>
            <Input
              id="edit-recurringComment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={updateRecurring.isPending}>
            {updateRecurring.isPending
              ? t("common.loading")
              : t("common.save")}
          </Button>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
