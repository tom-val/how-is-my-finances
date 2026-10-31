import { Pressable, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { formatMoney } from "./chartUtils";

export interface RankedBarItem {
  key: string;
  label: string;
  value: number;
  /** Secondary line under the bar (what the PWA showed in its tooltip). */
  detail?: string;
}

interface RankedBarListProps {
  items: RankedBarItem[];
  currency: string;
  /** Bar opacity (the PWA's `fillOpacity`). */
  opacity?: number;
  onItemPress?: (item: RankedBarItem, index: number) => void;
}

/**
 * Horizontal bar ranking: the PWA's recharts `layout="vertical"` bar charts as a list of rows.
 * Each row shows the name and amount above a primary-coloured bar scaled to the largest value,
 * so values read without a tooltip on touch screens. Rows are pressable when `onItemPress` is set.
 */
export function RankedBarList({ items, currency, opacity = 1, onItemPress }: RankedBarListProps) {
  const max = Math.max(0, ...items.map((item) => item.value));

  return (
    <View className="gap-1">
      {items.map((item, index) => {
        const percent = max > 0 ? Math.max(0, (item.value / max) * 100) : 0;
        const amount = formatMoney(item.value, currency);
        return (
          <Pressable
            key={item.key}
            disabled={!onItemPress}
            onPress={onItemPress ? () => onItemPress(item, index) : undefined}
            accessibilityRole={onItemPress ? "button" : undefined}
            accessibilityLabel={[item.label, amount, item.detail].filter(Boolean).join(", ")}
            className={cn(
              "gap-1.5 rounded-md py-1.5",
              onItemPress && "-mx-2 px-2 active:bg-accent web:hover:bg-accent",
            )}
          >
            <View className="flex-row items-center gap-3">
              <Text numberOfLines={1} className="flex-1 text-sm">
                {item.label}
              </Text>
              <Text className="text-sm font-medium">{amount}</Text>
              {onItemPress ? <Icon as={ChevronRight} size={14} className="text-muted-foreground" /> : null}
            </View>
            <View className="h-3 flex-row">
              <View
                className="h-full rounded-r bg-primary"
                style={{ width: `${percent}%`, minWidth: 2, opacity }}
              />
            </View>
            {item.detail ? (
              <Text numberOfLines={1} className="text-xs text-muted-foreground">
                {item.detail}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
