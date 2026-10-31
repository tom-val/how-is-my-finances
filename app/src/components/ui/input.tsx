import type { ComponentProps } from "react";
import { TextInput } from "react-native";
import { cn } from "@/lib/utils";
import { useTheme } from "@/theme/ThemeProvider";

export function Input({ className, editable = true, ...props }: ComponentProps<typeof TextInput>) {
  const { colours } = useTheme();
  return (
    <TextInput
      editable={editable}
      placeholderTextColor={colours["muted-foreground"]}
      className={cn(
        "h-11 w-full rounded-md border border-input bg-transparent px-3 text-base text-foreground md:h-9 md:text-sm dark:bg-input/30",
        "web:outline-none web:focus-visible:border-ring web:focus-visible:ring-2 web:focus-visible:ring-ring/50",
        !editable && "opacity-50",
        className,
      )}
      {...props}
    />
  );
}
