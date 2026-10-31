import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, type SelectOption } from "@/components/ui/select";

type PresetKey = "lastMonth" | "last3" | "last6" | "thisYear" | "allTime" | "custom";

interface TimePeriodSelectorProps {
  startYear: number;
  startMonth: number;
  endYear: number;
  endMonth: number;
  activePreset: PresetKey;
  earliestYear: number;
  onPresetChange: (preset: PresetKey) => void;
  onCustomChange: (
    startYear: number,
    startMonth: number,
    endYear: number,
    endMonth: number,
  ) => void;
}

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export function TimePeriodSelector({
  startYear,
  startMonth,
  endYear,
  endMonth,
  activePreset,
  earliestYear,
  onPresetChange,
  onCustomChange,
}: TimePeriodSelectorProps) {
  const { t } = useTranslation();

  const currentYear = new Date().getFullYear();

  const yearOptions: SelectOption[] = [];
  for (let y = earliestYear; y <= currentYear; y++) {
    yearOptions.push({ value: String(y), label: String(y) });
  }

  const monthOptions: SelectOption[] = MONTHS.map((m) => ({
    value: String(m),
    label: t(`months.monthNames.${m}`),
  }));

  const presets: { key: PresetKey; label: string }[] = [
    { key: "lastMonth", label: t("insights.lastMonth") },
    { key: "last3", label: t("insights.last3Months") },
    { key: "last6", label: t("insights.last6Months") },
    { key: "thisYear", label: t("insights.thisYear") },
    { key: "allTime", label: t("insights.allTime") },
    { key: "custom", label: t("insights.customRange") },
  ];

  return (
    <View className="gap-3">
      <View className="flex-row flex-wrap gap-2">
        {presets.map(({ key, label }) => (
          <Button
            key={key}
            variant={activePreset === key ? "default" : "outline"}
            size="sm"
            onPress={() => onPresetChange(key)}
            accessibilityState={{ selected: activePreset === key }}
          >
            {label}
          </Button>
        ))}
      </View>

      {activePreset === "custom" && (
        <View className="flex-row flex-wrap items-end gap-3">
          <View className="gap-1">
            <Label className="text-xs">{t("insights.from")}</Label>
            <View className="flex-row gap-1.5">
              <Select
                value={String(startMonth)}
                onValueChange={(v) => onCustomChange(startYear, Number(v), endYear, endMonth)}
                options={monthOptions}
                placeholder={t("insights.from")}
                className="w-32"
              />
              <Select
                value={String(startYear)}
                onValueChange={(v) => onCustomChange(Number(v), startMonth, endYear, endMonth)}
                options={yearOptions}
                placeholder={t("insights.from")}
                className="w-24"
              />
            </View>
          </View>

          <View className="gap-1">
            <Label className="text-xs">{t("insights.to")}</Label>
            <View className="flex-row gap-1.5">
              <Select
                value={String(endMonth)}
                onValueChange={(v) => onCustomChange(startYear, startMonth, endYear, Number(v))}
                options={monthOptions}
                placeholder={t("insights.to")}
                className="w-32"
              />
              <Select
                value={String(endYear)}
                onValueChange={(v) => onCustomChange(startYear, startMonth, Number(v), endMonth)}
                options={yearOptions}
                placeholder={t("insights.to")}
                className="w-24"
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

export type { PresetKey };
