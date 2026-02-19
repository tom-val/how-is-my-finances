import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@/components/shared/ResponsiveDialog";
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
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [vendor, setVendor] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setItemName("");
    setAmount("");
    setCategoryId("");
    setExpenseDate(new Date().toISOString().split("T")[0]);
    setVendor("");
    setComment("");
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const amountNum = parseFloat(amount);
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
        <Button size="sm" variant="outline">
          <TrendingDown className="h-4 w-4" />
          {t("expenses.expense")}
        </Button>
      </ResponsiveDialogTrigger>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {t("expenses.addExpense")}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="itemName">{t("expenses.itemName")}</Label>
            <Input
              id="itemName"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="amount">{t("expenses.amount")}</Label>
              <Input
                id="amount"
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
              <Label htmlFor="expenseDate">{t("expenses.date")}</Label>
              <Input
                id="expenseDate"
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
              categories={categories ?? []}
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
            <Label htmlFor="comment">{t("expenses.comment")}</Label>
            <Input
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={createExpense.isPending}>
            {createExpense.isPending ? t("common.loading") : t("common.save")}
          </Button>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
