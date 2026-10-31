import { useState } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import { MoneyInput } from "@/components/shared/MoneyInput";
import { parseDecimalInput } from "@/lib/format";
import { useUpdateMonth, useDeleteMonth } from "../hooks/useMonths";
import type { MonthDetail } from "@shared/types/month";

interface EditMonthDialogProps {
  month: MonthDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditMonthDialog({ month, open, onOpenChange }: EditMonthDialogProps) {
  const { t } = useTranslation();
  const updateMonth = useUpdateMonth();
  const deleteMonth = useDeleteMonth();
  const [salary, setSalary] = useState(month.salary.toString());
  const [error, setError] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  async function handleSubmit() {
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
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  const isPending = updateMonth.isPending || deleteMonth.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t("months.editMonth")}>
      <View className="gap-2">
        <Label nativeID="edit-salary-label">{t("months.salary")}</Label>
        <MoneyInput
          aria-labelledby="edit-salary-label"
          value={salary}
          onChange={setSalary}
          returnKeyType="done"
          onSubmitEditing={() => void handleSubmit()}
        />
      </View>
      {error && <Text className="text-sm text-destructive">{error}</Text>}
      <Button onPress={() => void handleSubmit()} loading={updateMonth.isPending} disabled={isPending}>
        {t("common.save")}
      </Button>

      <View className="mt-2 border-t border-border pt-4">
        {isConfirmingDelete ? (
          <View className="gap-3">
            <Text className="text-sm text-muted-foreground">{t("months.confirmDelete")}</Text>
            <View className="flex-row justify-end gap-2">
              <Button variant="outline" onPress={() => setIsConfirmingDelete(false)} disabled={isPending}>
                {t("common.cancel")}
              </Button>
              <Button
                variant="destructive"
                onPress={() => void handleDelete()}
                loading={deleteMonth.isPending}
                disabled={isPending}
              >
                {t("common.delete")}
              </Button>
            </View>
          </View>
        ) : (
          <Button
            variant="destructive"
            className="w-full"
            onPress={() => setIsConfirmingDelete(true)}
            disabled={isPending}
          >
            {t("months.deleteMonth")}
          </Button>
        )}
      </View>
    </Dialog>
  );
}
