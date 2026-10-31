import { Pressable } from "react-native";
import { ChevronsUpDown } from "lucide-react-native";
import { cn } from "@/lib/utils";
import { Icon } from "./icon";
import { Text } from "./text";

interface ComboboxTriggerProps {
  label: string;
  /** Muted styling when `label` is only the placeholder. */
  isPlaceholder?: boolean;
  onPress: () => void;
  className?: string;
}

/** The outline "button" that opens a combobox BottomSheet (shadcn combobox trigger look). */
export function ComboboxTrigger({ label, isPlaceholder, onPress, className }: ComboboxTriggerProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="combobox"
      className={cn(
        "h-11 flex-row items-center justify-between gap-2 rounded-md border border-input bg-background px-3 active:bg-accent md:h-9 web:hover:bg-accent dark:bg-input/30",
        className,
      )}
    >
      <Text numberOfLines={1} className={cn("flex-1 text-sm", isPlaceholder && "text-muted-foreground")}>
        {label}
      </Text>
      <Icon as={ChevronsUpDown} className="opacity-50" />
    </Pressable>
  );
}
