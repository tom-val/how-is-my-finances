import { useTranslation } from "react-i18next";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { CategoryTotal } from "@shared/types/analytics";

interface CategorySpendingChartProps {
  data: CategoryTotal[];
  currency: string;
}

export function CategorySpendingChart({
  data,
  currency,
}: CategorySpendingChartProps) {
  const { t } = useTranslation();

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {t("insights.noData")}
      </p>
    );
  }

  const chartData = data.slice(0, 10).map((item) => ({
    name: item.categoryName,
    total: item.total,
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 40)}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 16 }}>
        <XAxis
          type="number"
          tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
          tickFormatter={(v: number) => `${v.toFixed(0)} ${currency}`}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={120}
          tick={{ fontSize: 12, fill: "var(--color-foreground)" }}
        />
        <Tooltip
          formatter={(value: number | undefined) => [`${(value ?? 0).toFixed(2)} ${currency}`, t("insights.totalSpent")]}
          contentStyle={{
            backgroundColor: "var(--color-card)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Bar
          dataKey="total"
          fill="var(--color-primary)"
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
