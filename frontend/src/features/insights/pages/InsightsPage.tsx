import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { useAnalytics } from "@/features/insights/hooks/useInsights";
import { useMonths } from "@/features/months/hooks/useMonths";
import { useProfile } from "@/features/settings/hooks/useProfile";
import { TimePeriodSelector } from "@/features/insights/components/TimePeriodSelector";
import type { PresetKey } from "@/features/insights/components/TimePeriodSelector";
import { InsightCard } from "@/features/insights/components/InsightCard";
import { CategorySpendingChart } from "@/features/insights/components/CategorySpendingChart";
import { MonthlyTrendChart } from "@/features/insights/components/MonthlyTrendChart";
import type { MonthlyTrendData } from "@/features/insights/components/MonthlyTrendChart";
import { IncomeVsExpensesChart } from "@/features/insights/components/IncomeVsExpensesChart";
import type { IncomeVsExpensesData } from "@/features/insights/components/IncomeVsExpensesChart";
import { TopVendorsChart } from "@/features/insights/components/TopVendorsChart";

function getPresetRange(preset: Exclude<PresetKey, "custom">, earliestYear: number, earliestMonth: number) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  switch (preset) {
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

export function InsightsPage() {
  const { t } = useTranslation();
  const { data: profile } = useProfile();
  const { data: months, isLoading: isMonthsLoading } = useMonths();

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

  const { data: analytics, isLoading: isAnalyticsLoading } = useAnalytics(
    startYear,
    startMonth,
    endYear,
    endMonth,
  );

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
    return months.filter((m) => {
      const monthValue = m.year * 12 + m.monthNumber;
      const startValue = startYear * 12 + startMonth;
      const endValue = endYear * 12 + endMonth;
      return monthValue >= startValue && monthValue <= endValue;
    });
  }, [months, startYear, startMonth, endYear, endMonth]);

  const trendData: MonthlyTrendData[] = useMemo(() => {
    return filteredMonths
      .sort((a, b) => a.year * 12 + a.monthNumber - (b.year * 12 + b.monthNumber))
      .map((m) => ({
        label: `${t(`months.monthNames.${m.monthNumber}`)} ${m.year}`,
        totalSpent: m.totalSpent,
      }));
  }, [filteredMonths, t]);

  const incomeVsExpensesData: IncomeVsExpensesData[] = useMemo(() => {
    return filteredMonths
      .sort((a, b) => a.year * 12 + a.monthNumber - (b.year * 12 + b.monthNumber))
      .map((m) => ({
        label: `${t(`months.monthNames.${m.monthNumber}`)} ${m.year}`,
        income: m.salary + m.totalIncome,
        spent: m.totalSpent,
      }));
  }, [filteredMonths, t]);

  const isLoading = isMonthsLoading || isAnalyticsLoading;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("insights.title")}</h1>

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
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <InsightCard title={t("insights.topCategories")}>
            <CategorySpendingChart
              data={analytics?.categoryTotals ?? []}
              currency={currency}
            />
          </InsightCard>

          <InsightCard title={t("insights.monthlyTrend")}>
            <MonthlyTrendChart data={trendData} currency={currency} />
          </InsightCard>

          <InsightCard title={t("insights.incomeVsExpenses")}>
            <IncomeVsExpensesChart
              data={incomeVsExpensesData}
              currency={currency}
            />
          </InsightCard>

          <InsightCard title={t("insights.topVendors")}>
            <TopVendorsChart
              data={analytics?.vendorTotals ?? []}
              currency={currency}
            />
          </InsightCard>
        </div>
      )}
    </div>
  );
}
