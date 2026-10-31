/**
 * Parse a user-entered decimal string that may use comma or dot as the decimal separator.
 * Returns NaN for invalid input, matching parseFloat behaviour.
 */
export function parseDecimalInput(value: string): number {
  const normalised = value.replace(",", ".");
  return parseFloat(normalised);
}

/** Today as `YYYY-MM-DD` (UTC, matching the PWA's `toISOString().split("T")[0]`). */
export function todayIso(): string {
  return new Date().toISOString().split("T")[0];
}
