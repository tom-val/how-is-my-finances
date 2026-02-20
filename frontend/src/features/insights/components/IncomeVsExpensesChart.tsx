import { useTranslation } from "react-i18next";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

interface IncomeVsExpensesData {
  label: string;
  income: number;
  spent: number;
}

interface IncomeVsExpensesChartProps {
  data: IncomeVsExpensesData[];
  currency: string;
}

export function IncomeVsExpensesChart({
  data,
  currency,
}: IncomeVsExpensesChartProps) {
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
      <BarChart data={data} margin={{ left: 0, right: 16 }}>
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
          formatter={(value: number | undefined, name: string | undefined) => [
            `${(value ?? 0).toFixed(2)} ${currency}`,
            name === "income" ? t("insights.income") : t("insights.spent"),
          ]}
          contentStyle={{
            backgroundColor: "var(--color-card)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Legend
          formatter={(value: string) =>
            value === "income" ? t("insights.income") : t("insights.spent")
          }
        />
        <Bar
          dataKey="income"
          fill="oklch(0.65 0.15 150)"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="spent"
          fill="oklch(0.65 0.15 25)"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export type { IncomeVsExpensesData };
