import { useState } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { Pencil, Trash2 } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import type { Income } from "@shared/types/income";
import { EditIncomeDialog } from "./EditIncomeDialog";
import { DeleteIncomeDialog } from "./DeleteIncomeDialog";

interface IncomeCardProps {
  income: Income;
  monthId: string;
}

export function IncomeCard({ income, monthId }: IncomeCardProps) {
  const { t } = useTranslation();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  return (
    <>
      <View className="flex-row items-center gap-1 rounded-md border border-border py-1 pl-3 pr-1">
        <View className="min-w-0 flex-1 flex-row items-center gap-3">
          <View className="min-w-0 shrink">
            <Text numberOfLines={1} className="text-sm font-medium">
              {income.source}
            </Text>
            <Text numberOfLines={1} className="text-xs text-muted-foreground sm:hidden">
              {income.incomeDate}
            </Text>
          </View>
          <Text className="hidden shrink-0 text-xs text-muted-foreground sm:flex">{income.incomeDate}</Text>
          {income.comment ? (
            <Text numberOfLines={1} className="hidden shrink text-xs text-muted-foreground sm:flex">
              {income.comment}
            </Text>
          ) : null}
        </View>
        <Text className="shrink-0 pl-1 text-sm font-semibold text-green-600 dark:text-green-400">
          +{income.amount.toFixed(2)}
        </Text>
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0"
          onPress={() => setIsEditOpen(true)}
          accessibilityLabel={t("incomes.editIncome")}
        >
          <Icon as={Pencil} size={14} />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0"
          textClassName="text-destructive"
          onPress={() => setIsDeleteOpen(true)}
          accessibilityLabel={t("incomes.deleteIncome")}
        >
          <Icon as={Trash2} size={14} />
        </Button>
      </View>

      {isEditOpen && (
        <EditIncomeDialog
          income={income}
          monthId={monthId}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
        />
      )}

      <DeleteIncomeDialog
        incomeId={income.id}
        incomeSource={income.source}
        monthId={monthId}
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
      />
    </>
  );
}
