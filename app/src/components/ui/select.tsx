import { useState } from "react";
import { Pressable } from "react-native";
import { ChevronDown } from "lucide-react-native";
import { cn } from "@/lib/utils";
import { BottomSheet, SheetItem } from "./bottom-sheet";
import { Icon } from "./icon";
import { Text } from "./text";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  /** Sheet title, and the trigger text when nothing is selected. */
  placeholder: string;
  className?: string;
  disabled?: boolean;
}

/** Input-styled trigger that opens a BottomSheet of options. */
export function Select({ value, onValueChange, options, placeholder, className, disabled }: SelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        accessibilityRole="button"
        className={cn(
          "h-11 flex-row items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 md:h-9 dark:bg-input/30",
          disabled && "opacity-50",
          className,
        )}
      >
        <Text numberOfLines={1} className={cn("flex-1 text-sm", !selected && "text-muted-foreground")}>
          {selected?.label ?? placeholder}
        </Text>
        <Icon as={ChevronDown} className="opacity-50" />
      </Pressable>
      <BottomSheet open={open} onOpenChange={setOpen} title={placeholder}>
        {options.map((option) => (
          <SheetItem
            key={option.value}
            label={option.label}
            selected={option.value === value}
            onPress={() => {
              onValueChange(option.value);
              setOpen(false);
            }}
          />
        ))}
      </BottomSheet>
    </>
  );
}
