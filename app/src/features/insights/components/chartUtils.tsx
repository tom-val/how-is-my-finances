import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/ui/text";

/** The PWA's income / spent bar fills (`oklch(0.65 0.15 150)` / `oklch(0.65 0.15 25)`) as hex. */
export const INCOME_COLOUR = "#3aa85b";
export const SPENT_COLOUR = "#dc655f";

/** Axis tick font size (the PWA uses 12 px; 11 keeps two-line month labels compact on phones). */
export const AXIS_FONT_SIZE = 11;

/** Narrowest slot an x-axis label gets before every other label is skipped (as recharts does). */
export const MIN_X_LABEL_WIDTH = 60;

/** Width of the y-axis label column for whole-number ticks up to `maxValue`. */
export function yAxisLabelWidth(maxValue: number): number {
  const digits = String(Math.ceil(Math.max(0, maxValue))).length;
  return Math.max(28, digits * 7 + 10);
}

/** Show every n-th x-axis label so labels in `slotWidth`-wide slots don't overlap. */
export function xLabelStep(slotWidth: number): number {
  if (slotWidth <= 0) return 1;
  return Math.max(1, Math.ceil(MIN_X_LABEL_WIDTH / slotWidth));
}

/** "January 2026" → "January\n2026" so month labels take two short lines instead of one long one. */
function twoLineLabel(label: string): string {
  const lastSpace = label.lastIndexOf(" ");
  return lastSpace === -1 ? label : `${label.slice(0, lastSpace)}\n${label.slice(lastSpace + 1)}`;
}

interface XAxisLabelProps {
  label: string;
  /** Width of the label container gifted-charts centres on the data point / bar group. */
  slotWidth: number;
}

/**
 * Two-line, muted x-axis label. It is wider than narrow slots and re-centred on the data point,
 * so long month names stay readable when bars or points sit close together.
 */
export function XAxisLabel({ label, slotWidth }: XAxisLabelProps) {
  const width = Math.max(slotWidth, MIN_X_LABEL_WIDTH);
  // The View carries the width: react-native-web caps a Text at its parent's width.
  return (
    <View style={{ width, marginLeft: (slotWidth - width) / 2 }}>
      <Text
        numberOfLines={2}
        className="text-center text-muted-foreground"
        style={{ fontSize: AXIS_FONT_SIZE, lineHeight: 14 }}
      >
        {twoLineLabel(label)}
      </Text>
    </View>
  );
}

/** "No data for the selected period." placeholder shared by every insight chart. */
export function ChartEmpty() {
  const { t } = useTranslation();
  return <Text className="py-8 text-center text-sm text-muted-foreground">{t("insights.noData")}</Text>;
}

/** `12.5` → "12.50 EUR", as the PWA's tooltips format amounts. */
export function formatMoney(value: number, currency: string): string {
  return `${value.toFixed(2)} ${currency}`;
}
