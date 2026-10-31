import { cn } from "@/lib/utils";

interface DateInputProps {
  /** `YYYY-MM-DD` */
  value: string;
  onChange: (value: string) => void;
  className?: string;
  accessibilityLabel?: string;
}

/** Web: the browser's own date input, styled like Input. Native: date-input.tsx. */
export function DateInput({ value, onChange, className, accessibilityLabel }: DateInputProps) {
  return (
    <input
      type="date"
      value={value}
      aria-label={accessibilityLabel}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-11 w-full min-w-0 rounded-md border border-input bg-transparent px-3 text-base text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 md:h-9 md:text-sm dark:bg-input/30",
        className,
      )}
    />
  );
}
