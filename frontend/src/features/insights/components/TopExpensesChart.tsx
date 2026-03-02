import { useTranslation } from "react-i18next";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { ExpenseSummary } from "@shared/types/analytics";

interface TopExpensesChartProps {
  data: ExpenseSummary[];
  currency: string;
}

export function TopExpensesChart({ data, currency }: TopExpensesChartProps) {
  const { t } = useTranslation();

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {t("insights.noData")}
      </p>
    );
  }

  const chartData = [...data]
    .sort((a, b) => a.amount - b.amount)
    .map((item) => ({
      name: item.itemName,
      amount: item.amount,
      vendor: item.vendor,
      categoryName: item.categoryName,
      expenseDate: item.expenseDate,
    }));

  return (
    <ResponsiveContainer
      width="100%"
      height={Math.max(200, chartData.length * 40)}
    >
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ left: 0, right: 16 }}
      >
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
          formatter={(value: number | undefined) => [
            `${(value ?? 0).toFixed(2)} ${currency}`,
            t("insights.totalSpent"),
          ]}
          labelFormatter={(label, payload) => {
            const item = payload?.[0]?.payload as
              | Record<string, string>
              | undefined;
            const parts = [String(label)];
            if (item?.vendor) parts.push(item.vendor);
            if (item?.categoryName) parts.push(item.categoryName);
            return parts.join(" · ");
          }}
          contentStyle={{
            backgroundColor: "var(--color-card)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Bar
          dataKey="amount"
          fill="var(--color-primary)"
          radius={[0, 4, 4, 0]}
          fillOpacity={0.8}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
