import { Platform, Pressable } from "react-native";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { useTheme } from "@/theme/ThemeProvider";
import { Text } from "./text";

interface DateInputProps {
  /** `YYYY-MM-DD` */
  value: string;
  onChange: (value: string) => void;
  className?: string;
  accessibilityLabel?: string;
}

function toDate(value: string): Date {
  return value ? parseISO(value) : new Date();
}

function toIso(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Date field. iOS: the native compact picker (tap → calendar popover). Android: an input-styled
 * field that opens the Material date dialog. Web: date-input.web.tsx (`<input type="date">`).
 */
export function DateInput({ value, onChange, className, accessibilityLabel }: DateInputProps) {
  const { scheme, colours } = useTheme();

  if (Platform.OS === "ios") {
    return (
      <DateTimePicker
        value={toDate(value)}
        mode="date"
        display="compact"
        themeVariant={scheme}
        accentColor={colours.primary}
        accessibilityLabel={accessibilityLabel}
        onChange={(_event, date) => {
          if (date) onChange(toIso(date));
        }}
        style={{ alignSelf: "flex-start" }}
      />
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() =>
        DateTimePickerAndroid.open({
          value: toDate(value),
          mode: "date",
          onChange: (event, date) => {
            if (event.type === "set" && date) onChange(toIso(date));
          },
        })
      }
      className={cn(
        "h-11 justify-center rounded-md border border-input bg-transparent px-3 dark:bg-input/30",
        className,
      )}
    >
      <Text className="text-base">{value}</Text>
    </Pressable>
  );
}
