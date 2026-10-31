import { useMemo, useState, type ReactNode } from "react";
import { ActivityIndicator, useWindowDimensions, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Screen } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import { useMonths } from "@/features/months/hooks/useMonths";
import { useProfile } from "@/features/settings/hooks/useProfile";
import { useTheme } from "@/theme/ThemeProvider";
import { useAnalytics } from "../hooks/useInsights";
import { TimePeriodSelector, type PresetKey } from "../components/TimePeriodSelector";
import { InsightCard } from "../components/InsightCard";
import { CategorySpendingChart } from "../components/CategorySpendingChart";
import { MonthlyTrendChart, type MonthlyTrendData } from "../components/MonthlyTrendChart";
import {
  IncomeVsExpensesChart,
  type IncomeVsExpensesData,
} from "../components/IncomeVsExpensesChart";
import { TopVendorsChart } from "../components/TopVendorsChart";
import { TopExpensesChart } from "../components/TopExpensesChart";
import { DrillDownSheet, type DrillDownFilter } from "../components/DrillDownSheet";

/** Tailwind's `lg` breakpoint, where the PWA lays the cards out in two columns. */
const TWO_COLUMN_BREAKPOINT = 1024;

function getPresetRange(preset: Exclude<PresetKey, "custom">, earliestYear: number, earliestMonth: number) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  switch (preset) {
    case "lastMonth": {
      const d = new Date(currentYear, currentMonth - 1 - 1, 1);
      return { startYear: d.getFullYear(), startMonth: d.getMonth() + 1, endYear: d.getFullYear(), endMonth: d.getMonth() + 1 };
    }
    case "last3": {
      const d = new Date(currentYear, currentMonth - 1 - 2, 1);
      return { startYear: d.getFullYear(), startMonth: d.getMonth() + 1, endYear: currentYear, endMonth: currentMonth };
    }
    case "last6": {
      const d = new Date(currentYear, currentMonth - 1 - 5, 1);
      return { startYear: d.getFullYear(), startMonth: d.getMonth() + 1, endYear: currentYear, endMonth: currentMonth };
    }
    case "thisYear":
      return { startYear: currentYear, startMonth: 1, endYear: currentYear, endMonth: currentMonth };
    case "allTime":
      return { startYear: earliestYear, startMonth: earliestMonth, endYear: currentYear, endMonth: currentMonth };
  }
}

/** The PWA's `grid gap-6 lg:grid-cols-2`: one column on phones, rows of two cards from `lg` up. */
function CardGrid({ children }: { children: ReactNode[] }) {
  const { width } = useWindowDimensions();
  if (width < TWO_COLUMN_BREAKPOINT) {
    return <View className="gap-6">{children}</View>;
  }

  const rows: ReactNode[][] = [];
  for (let i = 0; i < children.length; i += 2) rows.push(children.slice(i, i + 2));

  return (
    <View className="gap-6">
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} className="flex-row gap-6">
          <View className="flex-1">{row[0]}</View>
          {/* An odd last card keeps half the width, as in a CSS grid. */}
          <View className="flex-1">{row[1] ?? null}</View>
        </View>
      ))}
    </View>
  );
}

export function InsightsScreen() {
  const { t } = useTranslation();
  const { colours } = useTheme();
  const { data: profile } = useProfile();
  const {
    data: months,
    isLoading: isMonthsLoading,
    isRefetching: isMonthsRefetching,
    refetch: refetchMonths,
  } = useMonths();

  const currency = profile?.preferredCurrency ?? "EUR";

  const earliestYear = useMemo(() => {
    if (!months || months.length === 0) return new Date().getFullYear();
    return Math.min(...months.map((m) => m.year));
  }, [months]);

  const earliestMonth = useMemo(() => {
    if (!months || months.length === 0) return 1;
    const minYear = Math.min(...months.map((m) => m.year));
    return Math.min(...months.filter((m) => m.year === minYear).map((m) => m.monthNumber));
  }, [months]);

  const defaultRange = getPresetRange("last3", earliestYear, earliestMonth);

  const [activePreset, setActivePreset] = useState<PresetKey>("last3");
  const [startYear, setStartYear] = useState(defaultRange.startYear);
  const [startMonth, setStartMonth] = useState(defaultRange.startMonth);
  const [endYear, setEndYear] = useState(defaultRange.endYear);
  const [endMonth, setEndMonth] = useState(defaultRange.endMonth);
  const [drillDown, setDrillDown] = useState<DrillDownFilter | null>(null);

  const {
    data: analytics,
    isLoading: isAnalyticsLoading,
    isRefetching: isAnalyticsRefetching,
    refetch: refetchAnalytics,
  } = useAnalytics(startYear, startMonth, endYear, endMonth);

  function handlePresetChange(preset: PresetKey) {
    setActivePreset(preset);
    if (preset !== "custom") {
      const range = getPresetRange(preset, earliestYear, earliestMonth);
      setStartYear(range.startYear);
      setStartMonth(range.startMonth);
      setEndYear(range.endYear);
      setEndMonth(range.endMonth);
    }
  }

  function handleCustomChange(sy: number, sm: number, ey: number, em: number) {
    setStartYear(sy);
    setStartMonth(sm);
    setEndYear(ey);
    setEndMonth(em);
  }

  const filteredMonths = useMemo(() => {
    if (!months) return [];
    const startValue = startYear * 12 + startMonth;
    const endValue = endYear * 12 + endMonth;
    return months
      .filter((m) => {
        const monthValue = m.year * 12 + m.monthNumber;
        return monthValue >= startValue && monthValue <= endValue;
      })
      .sort((a, b) => a.year * 12 + a.monthNumber - (b.year * 12 + b.monthNumber));
  }, [months, startYear, startMonth, endYear, endMonth]);

  const trendData: MonthlyTrendData[] = useMemo(
    () =>
      filteredMonths.map((m) => ({
        label: `${t(`months.monthNames.${m.monthNumber}`)} ${m.year}`,
        totalSpent: m.totalSpent,
      })),
    [filteredMonths, t],
  );

  const incomeVsExpensesData: IncomeVsExpensesData[] = useMemo(
    () =>
      filteredMonths.map((m) => ({
        label: `${t(`months.monthNames.${m.monthNumber}`)} ${m.year}`,
        income: m.salary + m.totalIncome,
        spent: m.totalSpent,
      })),
    [filteredMonths, t],
  );

  const isLoading = isMonthsLoading || isAnalyticsLoading;

  return (
    <Screen
      onRefresh={() => {
        void refetchMonths();
        void refetchAnalytics();
      }}
      refreshing={isMonthsRefetching || isAnalyticsRefetching}
    >
      <Text role="heading" className="text-2xl font-bold">
        {t("insights.title")}
      </Text>

      <TimePeriodSelector
        startYear={startYear}
        startMonth={startMonth}
        endYear={endYear}
        endMonth={endMonth}
        activePreset={activePreset}
        earliestYear={earliestYear}
        onPresetChange={handlePresetChange}
        onCustomChange={handleCustomChange}
      />

      {isLoading ? (
        <View className="items-center justify-center py-12">
          <ActivityIndicator color={colours["muted-foreground"]} />
        </View>
      ) : (
        <CardGrid>
          {[
            <InsightCard key="categories" title={t("insights.topCategories")}>
              <CategorySpendingChart
                data={analytics?.categoryTotals ?? []}
                currency={currency}
                onBarClick={(categoryId, categoryName) =>
                  setDrillDown({ type: "category", id: categoryId, name: categoryName })
                }
              />
            </InsightCard>,
            <InsightCard key="expenses" title={t("insights.topExpenses")}>
              <TopExpensesChart data={analytics?.topExpenses ?? []} currency={currency} />
            </InsightCard>,
            <InsightCard key="trend" title={t("insights.monthlyTrend")}>
              <MonthlyTrendChart data={trendData} currency={currency} />
            </InsightCard>,
            <InsightCard key="vendors" title={t("insights.topVendors")}>
              <TopVendorsChart
                data={analytics?.vendorTotals ?? []}
                currency={currency}
                onBarClick={(vendor) => setDrillDown({ type: "vendor", id: vendor, name: vendor })}
              />
            </InsightCard>,
            <InsightCard key="incomeVsExpenses" title={t("insights.incomeVsExpenses")}>
              <IncomeVsExpensesChart data={incomeVsExpensesData} currency={currency} />
            </InsightCard>,
          ]}
        </CardGrid>
      )}

      <DrillDownSheet
        filter={drillDown}
        onClose={() => setDrillDown(null)}
        startYear={startYear}
        startMonth={startMonth}
        endYear={endYear}
        endMonth={endMonth}
        currency={currency}
      />
    </Screen>
  );
}
