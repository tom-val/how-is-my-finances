import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/shared/MoneyInput";
import { parseDecimalInput } from "@/lib/format";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/shared/ResponsiveDialog";
import { useUpdateMonth, useDeleteMonth } from "../hooks/useMonths";
import type { MonthDetail } from "@shared/types/month";

interface EditMonthDialogProps {
  month: MonthDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditMonthDialog({
  month,
  open,
  onOpenChange,
}: EditMonthDialogProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const updateMonth = useUpdateMonth();
  const deleteMonth = useDeleteMonth();
  const [salary, setSalary] = useState(month.salary.toString());
  const [error, setError] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const salaryNum = parseDecimalInput(salary);
    if (isNaN(salaryNum) || salaryNum < 0) {
      setError("Salary must be a valid non-negative number");
      return;
    }

    try {
      await updateMonth.mutateAsync({
        id: month.id,
        request: { salary: salaryNum },
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  async function handleDelete() {
    setError(null);
    try {
      await deleteMonth.mutateAsync(month.id);
      onOpenChange(false);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  const isPending = updateMonth.isPending || deleteMonth.isPending;

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {t("months.editMonth")}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-salary">{t("months.salary")}</Label>
            <MoneyInput
              id="edit-salary"
              value={salary}
              onChange={setSalary}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={isPending}>
            {updateMonth.isPending ? t("common.loading") : t("common.save")}
          </Button>
        </form>

        <div className="border-t pt-4 mt-2">
          {isConfirmingDelete ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                {t("months.confirmDelete")}
              </p>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsConfirmingDelete(false)}
                  disabled={isPending}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isPending}
                >
                  {deleteMonth.isPending
                    ? t("common.loading")
                    : t("common.delete")}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => setIsConfirmingDelete(true)}
              disabled={isPending}
            >
              {t("months.deleteMonth")}
            </Button>
          )}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
