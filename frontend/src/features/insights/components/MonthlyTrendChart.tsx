import { useTranslation } from "react-i18next";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface MonthlyTrendData {
  label: string;
  totalSpent: number;
}

interface MonthlyTrendChartProps {
  data: MonthlyTrendData[];
  currency: string;
}

export function MonthlyTrendChart({ data, currency }: MonthlyTrendChartProps) {
  const { t } = useTranslation();

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {t("insights.noData")}
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={data} margin={{ left: 0, right: 16 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--color-border)"
        />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
          tickFormatter={(v: number) => `${v.toFixed(0)}`}
        />
        <Tooltip
          formatter={(value: number | undefined) => [`${(value ?? 0).toFixed(2)} ${currency}`, t("insights.spent")]}
          contentStyle={{
            backgroundColor: "var(--color-card)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Area
          type="monotone"
          dataKey="totalSpent"
          stroke="var(--color-primary)"
          fill="var(--color-primary)"
          fillOpacity={0.2}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export type { MonthlyTrendData };
