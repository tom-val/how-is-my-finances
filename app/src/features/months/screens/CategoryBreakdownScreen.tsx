import { useState, useMemo } from "react";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronDown, ChevronRight } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Label } from "@/components/ui/label";
import { Screen } from "@/components/ui/screen";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { LoadingScreen } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useMonth } from "../hooks/useMonths";
import { useExpenses } from "@/features/expenses/hooks/useExpenses";
import { ExpenseCard } from "@/features/expenses/components/ExpenseCard";
import type { ExpenseWithCategory } from "@shared/types/expense";

interface CategoryRowProps {
  categoryId: string;
  categoryName: string;
  total: number;
  totalSpent: number;
  expenses: ExpenseWithCategory[];
  monthId: string;
  showDivider: boolean;
}

function CategoryRow({
  categoryId,
  categoryName,
  total,
  totalSpent,
  expenses,
  monthId,
  showDivider,
}: CategoryRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const percentage = totalSpent > 0 ? Math.round((total / totalSpent) * 100) : 0;

  const categoryExpenses = useMemo(
    () => expenses.filter((e) => e.categoryId === categoryId),
    [expenses, categoryId],
  );

  return (
    <View className={cn(showDivider && "border-t border-border")}>
      <Pressable
        onPress={() => setIsExpanded((prev) => !prev)}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        className="min-h-11 flex-row items-center gap-3 rounded-md px-3 py-2.5 active:bg-muted/50 web:hover:bg-muted/50"
      >
        <Icon as={isExpanded ? ChevronDown : ChevronRight} className="shrink-0 text-muted-foreground" />

        <Text numberOfLines={1} className="shrink text-sm">
          {categoryName}
        </Text>

        <Text className="ml-auto shrink-0 text-xs text-muted-foreground">{percentage}%</Text>

        <Text className="shrink-0 text-sm font-medium">{total.toFixed(2)} EUR</Text>
      </Pressable>

      {isExpanded && (
        <View className="gap-2 pb-2 pl-7 pr-1 pt-1">
          {categoryExpenses.map((expense) => (
            <ExpenseCard key={expense.id} expense={expense} monthId={monthId} />
          ))}
        </View>
      )}
    </View>
  );
}

export function CategoryBreakdownScreen() {
  const { t } = useTranslation();
  const { monthId } = useLocalSearchParams<{ monthId: string }>();
  const {
    data: month,
    isLoading: isLoadingMonth,
    error: monthError,
    refetch: refetchMonth,
  } = useMonth(monthId);
  const {
    data: expenses,
    isLoading: isLoadingExpenses,
    refetch: refetchExpenses,
  } = useExpenses(monthId);
  const [showRecurring, setShowRecurring] = useState(true);

  const isLoading = isLoadingMonth || isLoadingExpenses;

  const filteredExpenses = useMemo(() => {
    if (!expenses) return [];
    return showRecurring ? expenses : expenses.filter((e) => !e.isRecurringInstance);
  }, [expenses, showRecurring]);

  const categoryBreakdown = useMemo(() => {
    const grouped = new Map<string, { categoryName: string; total: number }>();

    for (const expense of filteredExpenses) {
      const existing = grouped.get(expense.categoryId);
      if (existing) {
        existing.total += expense.amount;
      } else {
        grouped.set(expense.categoryId, {
          categoryName: expense.categoryName,
          total: expense.amount,
        });
      }
    }

    return Array.from(grouped.entries())
      .map(([categoryId, { categoryName, total }]) => ({ categoryId, categoryName, total }))
      .sort((a, b) => b.total - a.total);
  }, [filteredExpenses]);

  const totalSpent = categoryBreakdown.reduce((sum, item) => sum + item.total, 0);

  function handleRefresh() {
    return Promise.all([refetchMonth(), refetchExpenses()]);
  }

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace(`/months/${monthId}`);
  }

  if (isLoading) {
    return (
      <LoadingScreen />
    );
  }

  if (monthError || !month) {
    return (
      <Screen onRefresh={handleRefresh}>
        <Text className="text-destructive">{t("common.error")}</Text>
      </Screen>
    );
  }

  return (
    <Screen onRefresh={handleRefresh}>
      <View className="flex-row items-center gap-4">
        <Button variant="ghost" size="sm" onPress={goBack}>
          {t("common.back")}
        </Button>
        <Text role="heading" className="flex-1 text-2xl font-bold">
          {t("months.categoryBreakdown")}
        </Text>
      </View>

      <View className="flex-row items-center justify-between gap-4">
        <Text className="flex-1 text-sm text-muted-foreground">
          {t(`months.monthNames.${month.monthNumber}`)} {month.year} · {totalSpent.toFixed(2)} EUR{" "}
          {t("months.totalSpent").toLowerCase()}
        </Text>
        <View className="flex-row items-center gap-2">
          <Label className="text-sm" onPress={() => setShowRecurring((prev) => !prev)}>
            {t("categories.showRecurring")}
          </Label>
          <Switch
            checked={showRecurring}
            onCheckedChange={setShowRecurring}
            accessibilityLabel={t("categories.showRecurring")}
          />
        </View>
      </View>

      {categoryBreakdown.length === 0 ? (
        <Text className="text-sm text-muted-foreground">{t("months.noCategoryData")}</Text>
      ) : (
        <Card className="gap-0 p-0">
          <CardContent className="px-1 py-1 sm:px-2 sm:py-2">
            {categoryBreakdown.map((item, index) => (
              <CategoryRow
                key={item.categoryId}
                categoryId={item.categoryId}
                categoryName={item.categoryName}
                total={item.total}
                totalSpent={totalSpent}
                expenses={filteredExpenses}
                monthId={monthId}
                showDivider={index > 0}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </Screen>
  );
}
