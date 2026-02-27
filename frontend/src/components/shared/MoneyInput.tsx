import { type ChangeEvent, type ComponentProps } from "react";
import { Input } from "@/components/ui/input";

/** Characters allowed in a money input. */
const ALLOWED_CHARS_REGEX = /^[\d.,]*$/;

/** HTML5 pattern: digits with optional single dot or comma and up to 2 decimal places. */
const MONEY_PATTERN = "^\\d+([.,]\\d{0,2})?$";

interface MoneyInputProps
  extends Omit<
    ComponentProps<typeof Input>,
    "type" | "inputMode" | "pattern" | "onChange" | "autoComplete"
  > {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Numeric input for monetary values that accepts both comma and dot as decimal separators.
 *
 * Uses `type="text"` + `inputMode="decimal"` to show a numeric keyboard on mobile
 * without the native `type="number"` validation that rejects commas.
 */
export function MoneyInput({ value, onChange, ...props }: MoneyInputProps) {
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;

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
      type="text"
      inputMode="decimal"
      pattern={MONEY_PATTERN}
      autoComplete="off"
      value={value}
      onChange={handleChange}
      placeholder="0.00"
      {...props}
    />
  );
}
