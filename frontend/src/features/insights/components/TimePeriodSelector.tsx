import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type PresetKey = "last3" | "last6" | "thisYear" | "allTime" | "custom";

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

  const now = new Date();
  const currentYear = now.getFullYear();

  const years: number[] = [];
  for (let y = earliestYear; y <= currentYear; y++) {
    years.push(y);
  }

  const presets: { key: PresetKey; label: string }[] = [
    { key: "last3", label: t("insights.last3Months") },
    { key: "last6", label: t("insights.last6Months") },
    { key: "thisYear", label: t("insights.thisYear") },
    { key: "allTime", label: t("insights.allTime") },
    { key: "custom", label: t("insights.customRange") },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {presets.map(({ key, label }) => (
          <Button
            key={key}
            variant={activePreset === key ? "default" : "outline"}
            size="sm"
            onClick={() => onPresetChange(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {activePreset === "custom" && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <Label className="text-xs">{t("insights.from")}</Label>
            <div className="flex gap-1.5">
              <Select
                value={String(startMonth)}
                onValueChange={(v) =>
                  onCustomChange(startYear, Number(v), endYear, endMonth)
                }
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {t(`months.monthNames.${m}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={String(startYear)}
                onValueChange={(v) =>
                  onCustomChange(Number(v), startMonth, endYear, endMonth)
                }
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-xs">{t("insights.to")}</Label>
            <div className="flex gap-1.5">
              <Select
                value={String(endMonth)}
                onValueChange={(v) =>
                  onCustomChange(startYear, startMonth, endYear, Number(v))
                }
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {t(`months.monthNames.${m}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={String(endYear)}
                onValueChange={(v) =>
                  onCustomChange(startYear, startMonth, Number(v), endMonth)
                }
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export type { PresetKey };
