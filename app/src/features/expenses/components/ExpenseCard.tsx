import { useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Circle, CircleCheck, Pencil, Trash2 } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { todayIso } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useTheme } from "@/theme/ThemeProvider";
import type { ExpenseWithCategory } from "@shared/types/expense";
import { EditExpenseDialog } from "./EditExpenseDialog";
import { DeleteExpenseDialog } from "./DeleteExpenseDialog";
import { useToggleExpenseComplete } from "../hooks/useExpenses";

interface ExpenseCardProps {
  expense: ExpenseWithCategory;
  monthId: string;
}

function isPlannedExpense(expenseDate: string): boolean {
  return expenseDate > todayIso();
}

export function ExpenseCard({ expense, monthId }: ExpenseCardProps) {
  const { t } = useTranslation();
  const { colours } = useTheme();
  const toggleComplete = useToggleExpenseComplete(monthId);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const isPlanned = isPlannedExpense(expense.expenseDate);
  const isIncomplete = !expense.isCompleted;

  function handleToggleComplete() {
    toggleComplete.mutate(expense.id);
  }

  return (
    <>
      <View
        className={cn(
          "flex-row items-center gap-1 rounded-md border border-border py-1 pl-1 pr-1",
          isPlanned && "opacity-60",
          isIncomplete && "border-dashed border-orange-300 dark:border-orange-700",
        )}
      >
        <Pressable
          onPress={handleToggleComplete}
          disabled={toggleComplete.isPending}
          accessibilityRole="button"
          accessibilityLabel={isIncomplete ? t("expenses.markAsCompleted") : t("expenses.markAsIncomplete")}
          className="h-11 w-10 shrink-0 items-center justify-center"
        >
          {toggleComplete.isPending ? (
            <ActivityIndicator size="small" color={colours["muted-foreground"]} />
          ) : (
            <Icon
              as={isIncomplete ? Circle : CircleCheck}
              className={isIncomplete ? "text-orange-500" : "text-green-600"}
            />
          )}
        </Pressable>
        <View className="min-w-0 flex-1 flex-row items-center gap-3">
          <View className="min-w-0 shrink">
            <Text numberOfLines={1} className="text-sm font-medium">
              {expense.itemName}
            </Text>
            <Text numberOfLines={1} className="text-xs text-muted-foreground sm:hidden">
              {expense.categoryName}
            </Text>
          </View>
          <Text numberOfLines={1} className="hidden shrink-0 text-xs text-muted-foreground sm:flex">
            {expense.categoryName}
          </Text>
          <Text className="hidden shrink-0 text-xs text-muted-foreground sm:flex">{expense.expenseDate}</Text>
          {isPlanned && (
            <View className="hidden shrink-0 rounded bg-muted px-1 py-0.5 sm:flex">
              <Text className="text-[10px] font-medium">{t("months.plannedSpent")}</Text>
            </View>
          )}
          {expense.vendor ? (
            <Text numberOfLines={1} className="hidden shrink text-xs text-muted-foreground sm:flex">
              {expense.vendor}
            </Text>
          ) : null}
        </View>
        <Text className="shrink-0 pl-1 text-sm font-semibold">{expense.amount.toFixed(2)}</Text>
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0"
          onPress={() => setIsEditOpen(true)}
          accessibilityLabel={t("expenses.editExpense")}
        >
          <Icon as={Pencil} size={14} />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0"
          textClassName="text-destructive"
          onPress={() => setIsDeleteOpen(true)}
          accessibilityLabel={t("expenses.deleteExpense")}
        >
          <Icon as={Trash2} size={14} />
        </Button>
      </View>

      {isEditOpen && (
        <EditExpenseDialog
          expense={expense}
          monthId={monthId}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
        />
      )}

      <DeleteExpenseDialog
        expenseId={expense.id}
        expenseName={expense.itemName}
        monthId={monthId}
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
      />
    </>
  );
}
