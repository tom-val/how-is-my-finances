import { ActivityIndicator, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Dialog } from "@/components/ui/dialog";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/theme/ThemeProvider";
import { useAnalyticsExpenses } from "../hooks/useInsights";

export interface DrillDownFilter {
  type: "category" | "vendor";
  id: string;
  name: string;
}

interface DrillDownSheetProps {
  filter: DrillDownFilter | null;
  onClose: () => void;
  startYear: number;
  startMonth: number;
  endYear: number;
  endMonth: number;
  currency: string;
}

export function DrillDownSheet({
  filter,
  onClose,
  startYear,
  startMonth,
  endYear,
  endMonth,
  currency,
}: DrillDownSheetProps) {
  const { t } = useTranslation();
  const { colours } = useTheme();

  const { data: expenses, isLoading } = useAnalyticsExpenses(
    startYear,
    startMonth,
    endYear,
    endMonth,
    filter?.type === "category" ? filter.id : undefined,
    filter?.type === "vendor" ? filter.name : undefined,
  );

  const title =
    filter?.type === "category"
      ? t("insights.drillDown.category", { name: filter.name })
      : t("insights.drillDown.vendor", { name: filter?.name });

  return (
    <Dialog open={filter !== null} onOpenChange={(open) => !open && onClose()} title={title}>
      {expenses ? (
        <Text className="-mt-2 text-sm text-muted-foreground">
          {t("insights.drillDown.count", { count: expenses.length })}
        </Text>
      ) : null}

      {isLoading ? (
        <View className="items-center justify-center py-12">
          <ActivityIndicator color={colours["muted-foreground"]} />
        </View>
      ) : !expenses || expenses.length === 0 ? (
        <Text className="py-8 text-center text-sm text-muted-foreground">{t("insights.noData")}</Text>
      ) : (
        <View className="gap-2">
          {expenses.map((expense) => (
            <View
              key={expense.id}
              className="flex-row items-center justify-between gap-2 rounded-lg border border-border p-3"
            >
              <View className="min-w-0 flex-1 gap-0.5">
                <Text numberOfLines={1} className="text-sm font-medium">
                  {expense.itemName}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {[
                    filter?.type !== "category" && expense.categoryName,
                    filter?.type !== "vendor" && expense.vendor,
                    expense.expenseDate,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </View>
              <Text className="shrink-0 text-sm font-semibold">
                {expense.amount.toFixed(2)} {currency}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Dialog>
  );
}
