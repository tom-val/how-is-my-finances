import type { CategoryTotal } from "@shared/types/analytics";
import { ChartEmpty } from "./chartUtils";
import { RankedBarList } from "./RankedBarList";

interface CategorySpendingChartProps {
  data: CategoryTotal[];
  currency: string;
  onBarClick?: (categoryId: string, categoryName: string) => void;
}

export function CategorySpendingChart({ data, currency, onBarClick }: CategorySpendingChartProps) {
  if (data.length === 0) {
    return <ChartEmpty />;
  }

  const chartData = data.slice(0, 10).map((item) => ({
    key: item.categoryId,
    label: item.categoryName,
    value: item.total,
  }));

  return (
    <RankedBarList
      items={chartData}
      currency={currency}
      onItemPress={
        onBarClick
          ? (item) => {
              if (item.key) onBarClick(item.key, item.label);
            }
          : undefined
      }
    />
  );
}
