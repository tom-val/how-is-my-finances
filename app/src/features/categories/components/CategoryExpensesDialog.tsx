import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { Dialog } from "@/components/ui/dialog";
import { Text } from "@/components/ui/text";
import { Spinner } from "@/components/ui/spinner";
import { useExpensesByCategory } from "@/features/expenses/hooks/useExpenses";
import type { Category } from "@shared/types/category";

interface CategoryExpensesDialogProps {
  category: Category;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoryExpensesDialog({
  category,
  open,
  onOpenChange,
}: CategoryExpensesDialogProps) {
  const { t } = useTranslation();
  const { data: expenses, isLoading } = useExpensesByCategory(open ? category.id : null);

  const total = expenses?.reduce((sum, e) => sum + e.amount, 0) ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={category.name}>
      <View className="gap-3">
        {isLoading && <Spinner />}
        {expenses && expenses.length === 0 && (
          <Text className="text-sm text-muted-foreground">{t("categories.noExpenses")}</Text>
        )}
        {expenses && expenses.length > 0 && (
          <>
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-muted-foreground">
                {t("categories.expenseCount", { count: expenses.length })}
              </Text>
              <Text className="text-sm font-semibold tabular-nums">{total.toFixed(2)}</Text>
            </View>
            <View className="gap-1">
              {expenses.map((expense) => (
                <View
                  key={expense.id}
                  className="flex-row items-center gap-3 rounded-md border border-border px-3 py-1.5"
                >
                  <Text className="text-xs text-muted-foreground">{expense.expenseDate}</Text>
                  <Text numberOfLines={1} className="min-w-0 shrink text-sm font-medium">
                    {expense.itemName}
                  </Text>
                  {expense.vendor ? (
                    <Text
                      numberOfLines={1}
                      className="hidden min-w-0 shrink text-xs text-muted-foreground sm:flex"
                    >
                      {expense.vendor}
                    </Text>
                  ) : null}
                  <Text className="ml-auto text-sm font-semibold tabular-nums">
                    {expense.amount.toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </View>
    </Dialog>
  );
}
