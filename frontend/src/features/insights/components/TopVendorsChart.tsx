import { useTranslation } from "react-i18next";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { Payload } from "recharts/types/component/DefaultTooltipContent";
import type { VendorTotal } from "@shared/types/analytics";

interface TopVendorsChartProps {
  data: VendorTotal[];
  currency: string;
}

export function TopVendorsChart({ data, currency }: TopVendorsChartProps) {
  const { t } = useTranslation();

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {t("insights.noData")}
      </p>
    );
  }

  const chartData = data.slice(0, 10).map((item) => ({
    name: item.vendor,
    total: item.total,
    count: item.count,
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
          formatter={(value: number | undefined, _name: string | undefined, entry: Payload<number, string> | undefined) => {
            const count = (entry?.payload as Record<string, number> | undefined)?.count ?? 0;
            return [
              `${(value ?? 0).toFixed(2)} ${currency} (${count} ${t("insights.transactions")})`,
              t("insights.totalSpent"),
            ];
          }}
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
          fillOpacity={0.7}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
