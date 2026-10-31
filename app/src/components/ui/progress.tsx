import { View } from "react-native";
import { cn } from "@/lib/utils";

interface ProgressProps {
  /** 0–100 */
  value: number;
  className?: string;
  indicatorClassName?: string;
}

export function Progress({ value, className, indicatorClassName }: ProgressProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <View className={cn("h-2 w-full overflow-hidden rounded-full bg-primary/20", className)}>
      <View className={cn("h-full bg-primary", indicatorClassName)} style={{ width: `${clamped}%` }} />
    </View>
  );
}
