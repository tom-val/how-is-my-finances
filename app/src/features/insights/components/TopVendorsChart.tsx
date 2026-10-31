import { useTranslation } from "react-i18next";
import type { VendorTotal } from "@shared/types/analytics";
import { ChartEmpty } from "./chartUtils";
import { RankedBarList } from "./RankedBarList";

interface TopVendorsChartProps {
  data: VendorTotal[];
  currency: string;
  onBarClick?: (vendor: string) => void;
}

export function TopVendorsChart({ data, currency, onBarClick }: TopVendorsChartProps) {
  const { t } = useTranslation();

  if (data.length === 0) {
    return <ChartEmpty />;
  }

  const chartData = data.slice(0, 10).map((item) => ({
    key: item.vendor,
    label: item.vendor,
    value: item.total,
    detail: `${item.count} ${t("insights.transactions")}`,
  }));

  return (
    <RankedBarList
      items={chartData}
      currency={currency}
      opacity={0.7}
      onItemPress={
        onBarClick
          ? (item) => {
              if (item.label) onBarClick(item.label);
            }
          : undefined
      }
    />
  );
}
