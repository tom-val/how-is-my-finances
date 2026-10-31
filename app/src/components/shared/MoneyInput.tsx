import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";

/** Characters allowed in a money input. */
const ALLOWED_CHARS_REGEX = /^[\d.,]*$/;

interface MoneyInputProps
  extends Omit<
    ComponentProps<typeof Input>,
    "keyboardType" | "inputMode" | "onChange" | "onChangeText" | "value"
  > {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Numeric input for monetary values that accepts both comma and dot as decimal separators,
 * with the decimal keypad on phones.
 */
export function MoneyInput({ value, onChange, ...props }: MoneyInputProps) {
  function handleChange(raw: string) {
    // Allow clearing the field
    if (raw === "") {
      onChange(raw);
      return;
    }

    // Block non-numeric characters except dot and comma
    if (!ALLOWED_CHARS_REGEX.test(raw)) {
      return;
    }

    // Prevent multiple decimal separators
    const separatorCount = (raw.match(/[.,]/g) ?? []).length;
    if (separatorCount > 1) {
      return;
    }

    // Limit to 2 decimal places
    const separatorIndex = raw.search(/[.,]/);
    if (separatorIndex !== -1 && raw.length - separatorIndex - 1 > 2) {
      return;
    }

    onChange(raw);
  }

  return (
    <Input
      keyboardType="decimal-pad"
      inputMode="decimal"
      autoComplete="off"
      value={value}
      onChangeText={handleChange}
      placeholder="0.00"
      {...props}
    />
  );
}
