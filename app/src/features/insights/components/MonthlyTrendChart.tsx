import { useState } from "react";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";
import { LineChart, type lineDataItem } from "react-native-gifted-charts";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/theme/ThemeProvider";
import { useLayoutWidth } from "../hooks/useLayoutWidth";
import { AXIS_FONT_SIZE, ChartEmpty, formatMoney, XAxisLabel, xLabelStep, yAxisLabelWidth } from "./chartUtils";

interface MonthlyTrendData {
  label: string;
  totalSpent: number;
}

interface MonthlyTrendChartProps {
  data: MonthlyTrendData[];
  currency: string;
}

const PLOT_HEIGHT = 190;
/** Room left and right of the first / last point so their month labels aren't clipped. */
const EDGE_SPACING = 30;

export function MonthlyTrendChart({ data, currency }: MonthlyTrendChartProps) {
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

  const max = Math.max(...data.map((d) => d.totalSpent));
  const labelWidth = yAxisLabelWidth(max);
  const plotWidth = Math.max(0, width - labelWidth - 4);
  const single = data.length === 1;
  // Points span the plot edge to edge (recharts' category axis); a lone point sits in the middle.
  const initialSpacing = single ? plotWidth / 2 : EDGE_SPACING;
  const spacing = single
    ? plotWidth / 2
    : Math.max(1, (plotWidth - EDGE_SPACING * 2) / (data.length - 1));
  const step = xLabelStep(spacing);

  // Recharts' Area shows no dots; the tapped (or latest) month gets a dot and a strip instead.
  const chartData: lineDataItem[] = data.map((item, index) => ({
    value: item.totalSpent,
    hideDataPoint: index !== selectedIndex,
    showStrip: index === selectedIndex,
    labelComponent:
      index % step === 0 ? () => <XAxisLabel label={item.label} slotWidth={spacing} /> : undefined,
  }));

  return (
    <View className="gap-3">
      <View onLayout={onLayout} className="overflow-hidden">
        {width > 0 ? (
          <>
            <LineChart
              data={chartData}
              width={plotWidth}
              height={PLOT_HEIGHT}
              initialSpacing={initialSpacing}
              endSpacing={single ? 0 : EDGE_SPACING}
              spacing={spacing}
              maxValue={max > 0 ? undefined : 4}
              noOfSections={4}
              disableScroll
              areaChart
              curved
              color={colours.primary}
              thickness={2}
              startFillColor={colours.primary}
              endFillColor={colours.primary}
              startOpacity={0.2}
              endOpacity={0.2}
              dataPointsColor={colours.primary}
              dataPointsRadius={4}
              stripColor={colours["muted-foreground"]}
              stripOpacity={0.6}
              stripWidth={1}
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
            {/*
              Tap targets, one column per month. gifted-charts' own focus handling relies on SVG
              onPressIn, which react-native-svg doesn't support on web, so selection is done here.
            */}
            {data.map((item, index) => (
              <Pressable
                key={item.label}
                onPress={() => setSelection({ signature, index })}
                accessibilityRole="button"
                accessibilityLabel={`${item.label}: ${formatMoney(item.totalSpent, currency)}`}
                className="absolute top-0"
                style={{
                  left: labelWidth + initialSpacing + spacing * index - spacing / 2,
                  width: spacing,
                  height: PLOT_HEIGHT + 20,
                }}
              />
            ))}
          </>
        ) : (
          <View style={{ height: PLOT_HEIGHT + 50 }} />
        )}
      </View>
      {shown ? (
        <View className="flex-row flex-wrap items-baseline justify-between gap-x-3">
          <Text className="text-xs text-muted-foreground">{shown.label}</Text>
          <Text className="text-sm font-medium">
            {t("insights.spent")}: {formatMoney(shown.totalSpent, currency)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export type { MonthlyTrendData };
