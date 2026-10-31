import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

interface SpendingProgressBarProps {
  spentAmount: number;
  plannedAmount: number;
  spentPercentage: number;
  plannedPercentage: number;
}

function getSpentColourClass(total: number): string {
  if (total > 90) return "bg-red-500";
  if (total >= 70) return "bg-amber-500";
  return "bg-green-500";
}

function getPlannedColourClass(total: number): string {
  if (total > 90) return "bg-red-300";
  if (total >= 70) return "bg-amber-300";
  return "bg-green-300";
}

export function SpendingProgressBar({
  spentAmount,
  plannedAmount,
  spentPercentage,
  plannedPercentage,
}: SpendingProgressBarProps) {
  const { t } = useTranslation();

  const totalPercentage = spentPercentage + plannedPercentage;
  const totalAmount = spentAmount + plannedAmount;
  const clampedSpent = Math.min(spentPercentage, 100);
  const clampedPlanned = Math.min(plannedPercentage, 100 - clampedSpent);

  return (
    <View className="gap-1">
      <View className="flex-row justify-between gap-2">
        <Text className="text-xs text-muted-foreground">
          {totalAmount.toFixed(2)} EUR {t("months.totalSpent").toLowerCase()}
        </Text>
        <Text className="shrink text-xs text-muted-foreground">
          {plannedPercentage > 0
            ? `${spentPercentage}% + ${plannedPercentage}% ${t("months.plannedSpent")}`
            : `${totalPercentage}%`}
        </Text>
      </View>
      <View className="relative h-3 w-full overflow-hidden rounded-full bg-primary/20">
        {clampedSpent > 0 && (
          <View
            className={cn(
              "absolute inset-y-0 left-0 rounded-l-full",
              getSpentColourClass(totalPercentage),
              clampedPlanned === 0 && "rounded-r-full",
            )}
            style={{ width: `${clampedSpent}%` }}
          />
        )}
        {clampedPlanned > 0 && (
          <View
            className={cn(
              "absolute inset-y-0 rounded-r-full",
              getPlannedColourClass(totalPercentage),
              clampedSpent === 0 && "rounded-l-full",
            )}
            style={{ left: `${clampedSpent}%`, width: `${clampedPlanned}%` }}
          />
        )}
      </View>
    </View>
  );
}
