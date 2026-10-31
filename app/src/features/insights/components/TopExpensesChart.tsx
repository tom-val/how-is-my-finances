import type { ExpenseSummary } from "@shared/types/analytics";
import { ChartEmpty } from "./chartUtils";
import { RankedBarList } from "./RankedBarList";

interface TopExpensesChartProps {
  data: ExpenseSummary[];
  currency: string;
}

export function TopExpensesChart({ data, currency }: TopExpensesChartProps) {
  if (data.length === 0) {
    return <ChartEmpty />;
  }

  const chartData = [...data]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10)
    .map((item) => ({
      key: item.id,
      label: item.itemName,
      value: item.amount,
      // The PWA's tooltip label: "name · vendor · category" (the name is already the row title).
      detail: [item.vendor, item.categoryName].filter(Boolean).join(" · ") || undefined,
    }));

  return <RankedBarList items={chartData} currency={currency} opacity={0.8} />;
}
