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

export function EditExpenseDialog({
  expense,
  monthId,
  open,
  onOpenChange,
}: EditExpenseDialogProps) {
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
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {t("expenses.editExpense")}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-itemName">{t("expenses.itemName")}</Label>
            <Input
              id="edit-itemName"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-amount">{t("expenses.amount")}</Label>
              <Input
                id="edit-amount"
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
              <Label htmlFor="edit-expenseDate">{t("expenses.date")}</Label>
              <Input
                id="edit-expenseDate"
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
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
            <Label htmlFor="edit-comment">{t("expenses.comment")}</Label>
            <Input
              id="edit-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={updateExpense.isPending}>
            {updateExpense.isPending ? t("common.loading") : t("common.save")}
          </Button>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
