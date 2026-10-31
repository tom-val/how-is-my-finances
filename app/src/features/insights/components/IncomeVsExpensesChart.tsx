import { useState } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { BarChart, type barDataItem } from "react-native-gifted-charts";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/theme/ThemeProvider";
import { useLayoutWidth } from "../hooks/useLayoutWidth";
import {
  AXIS_FONT_SIZE,
  ChartEmpty,
  formatMoney,
  INCOME_COLOUR,
  MIN_X_LABEL_WIDTH,
  SPENT_COLOUR,
  XAxisLabel,
  xLabelStep,
  yAxisLabelWidth,
} from "./chartUtils";

interface IncomeVsExpensesData {
  label: string;
  income: number;
  spent: number;
}

interface IncomeVsExpensesChartProps {
  data: IncomeVsExpensesData[];
  currency: string;
}

const PLOT_HEIGHT = 170;
/** Gap between the income and spent bar of one month. */
const INNER_GAP = 2;
const MIN_BAR_WIDTH = 3;
const MAX_BAR_WIDTH = 28;

export function IncomeVsExpensesChart({ data, currency }: IncomeVsExpensesChartProps) {
  const { t } = useTranslation();
  const { colours } = useTheme();
  const { width, onLayout } = useLayoutWidth();
  // The selection is tied to the data it was made on, so a new period starts on its latest month.
  const signature = data.map((d) => d.label).join("|");
  const [selection, setSelection] = useState<{ signature: string; index: number } | null>(null);

  if (data.length === 0) {
    return <ChartEmpty />;
  }

  const selectedIndex =
    selection && selection.signature === signature ? selection.index : data.length - 1;
  const shown = data[selectedIndex];

  const max = Math.max(...data.map((d) => Math.max(d.income, d.spent)));
  const labelWidth = yAxisLabelWidth(max);
  const plotWidth = Math.max(0, width - labelWidth - 4);

  // Narrow months get labels wider than their slot; keep room at both ends so the first and last
  // labels aren't clipped.
  const labelOverhang = Math.max(0, (MIN_X_LABEL_WIDTH - plotWidth / data.length) / 2);
  // Grouped bars (recharts' default category gap is ~20% of each month's slot).
  const groupWidth = (plotWidth - labelOverhang * 2) / data.length;
  const barWidth = Math.min(
    MAX_BAR_WIDTH,
    Math.max(MIN_BAR_WIDTH, (groupWidth * 0.8 - INNER_GAP) / 2),
  );
  const groupSpacing = Math.max(4, groupWidth - barWidth * 2 - INNER_GAP);
  const slotWidth = barWidth * 2 + INNER_GAP + groupSpacing;
  // Very long periods squeeze bars to MIN_BAR_WIDTH; past that the chart scrolls sideways.
  const fitsWidth = slotWidth * data.length + labelOverhang * 2 <= plotWidth + 1;
  const step = xLabelStep(slotWidth);

  const chartData: barDataItem[] = data.flatMap((item, index) => [
    {
      value: item.income,
      frontColor: INCOME_COLOUR,
      spacing: INNER_GAP,
      // The label container spans `labelWidth + spacing` from the income bar, i.e. the month's
      // pair of bars, and XAxisLabel centres its text on it.
      labelWidth: barWidth * 2,
      labelComponent:
        index % step === 0
          ? () => <XAxisLabel label={item.label} slotWidth={barWidth * 2 + INNER_GAP} />
          : undefined,
    },
    { value: item.spent, frontColor: SPENT_COLOUR },
  ]);

  return (
    <View className="gap-3">
      <View onLayout={onLayout} className="overflow-hidden">
        {width > 0 ? (
          <BarChart
            data={chartData}
            width={plotWidth}
            height={PLOT_HEIGHT}
            barWidth={barWidth}
            spacing={groupSpacing}
            // gifted-charts pads bar charts by initialSpacing twice (scroll content + bar row), so
            // halve the intended lead-in (label room + half a month's gap).
            initialSpacing={(labelOverhang + groupSpacing / 2) / 2}
            endSpacing={0}
            disableScroll={fitsWidth}
            maxValue={max > 0 ? undefined : 4}
            noOfSections={4}
            barBorderTopLeftRadius={Math.min(4, barWidth / 2)}
            barBorderTopRightRadius={Math.min(4, barWidth / 2)}
            onPress={(_item: barDataItem, index: number) =>
              setSelection({ signature, index: Math.floor(index / 2) })
            }
            yAxisLabelWidth={labelWidth}
            yAxisTextStyle={{ color: colours["muted-foreground"], fontSize: AXIS_FONT_SIZE }}
            formatYLabel={(label) => Number(label).toFixed(0)}
            yAxisColor={colours["muted-foreground"]}
            xAxisColor={colours["muted-foreground"]}
            yAxisThickness={1}
            xAxisThickness={1}
            rulesType="dashed"
            rulesColor={colours.border}
            dashWidth={3}
            dashGap={3}
            xAxisTextNumberOfLines={2}
          />
        ) : (
          <View style={{ height: PLOT_HEIGHT + 50 }} />
        )}
      </View>

      {/* Legend (recharts <Legend />). */}
      <View className="flex-row justify-center gap-4">
        <LegendItem colour={INCOME_COLOUR} label={t("insights.income")} />
        <LegendItem colour={SPENT_COLOUR} label={t("insights.spent")} />
      </View>

      {shown ? (
        <View className="gap-0.5">
          <Text className="text-xs text-muted-foreground">{shown.label}</Text>
          <View className="flex-row flex-wrap gap-x-4">
            <Text className="text-sm font-medium">
              {t("insights.income")}: {formatMoney(shown.income, currency)}
            </Text>
            <Text className="text-sm font-medium">
              {t("insights.spent")}: {formatMoney(shown.spent, currency)}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function LegendItem({ colour, label }: { colour: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: colour }} />
      <Text className="text-xs text-muted-foreground">{label}</Text>
    </View>
  );
}

export type { IncomeVsExpensesData };
