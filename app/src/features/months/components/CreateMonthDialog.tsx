import { useState } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Text } from "@/components/ui/text";
import { MoneyInput } from "@/components/shared/MoneyInput";
import { parseDecimalInput } from "@/lib/format";
import { useCreateMonth } from "../hooks/useMonths";

const currentDate = new Date();
const currentYear = currentDate.getFullYear();
const currentMonth = currentDate.getMonth() + 1;

export function CreateMonthDialog() {
  const { t } = useTranslation();
  const createMonth = useCreateMonth();
  const [isOpen, setIsOpen] = useState(false);
  const [year, setYear] = useState(currentYear.toString());
  const [month, setMonth] = useState(currentMonth.toString());
  const [salary, setSalary] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);

    const salaryNum = parseDecimalInput(salary);
    if (isNaN(salaryNum) || salaryNum < 0) {
      setError("Salary must be a valid non-negative number");
      return;
    }

    try {
      await createMonth.mutateAsync({
        year: parseInt(year),
        month: parseInt(month),
        salary: salaryNum,
      });
      setIsOpen(false);
      setSalary("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  const years = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <>
      <Button onPress={() => setIsOpen(true)}>{t("months.createMonth")}</Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen} title={t("months.createMonth")}>
        <View className="flex-row gap-4">
          <View className="min-w-0 flex-1 gap-2">
            <Label>{t("months.year")}</Label>
            <Select
              value={year}
              onValueChange={setYear}
              placeholder={t("months.year")}
              options={years.map((y) => ({ value: y.toString(), label: y.toString() }))}
            />
          </View>
          <View className="min-w-0 flex-1 gap-2">
            <Label>{t("months.month")}</Label>
            <Select
              value={month}
              onValueChange={setMonth}
              placeholder={t("months.month")}
              options={months.map((m) => ({ value: m.toString(), label: t(`months.monthNames.${m}`) }))}
            />
          </View>
        </View>
        <View className="gap-2">
          <Label nativeID="salary-label">{t("months.salary")}</Label>
          <MoneyInput
            aria-labelledby="salary-label"
            value={salary}
            onChange={setSalary}
            returnKeyType="done"
            onSubmitEditing={() => void handleSubmit()}
          />
        </View>
        {error && <Text className="text-sm text-destructive">{error}</Text>}
        <Button onPress={() => void handleSubmit()} loading={createMonth.isPending}>
          {t("common.save")}
        </Button>
      </Dialog>
    </>
  );
}
