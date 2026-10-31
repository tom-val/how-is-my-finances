import { differenceInCalendarDays, format, formatDistanceToNow, parseISO } from "date-fns";
import { enGB, lt } from "date-fns/locale";
import type { BankDirection } from "@shared/types/bank";

function locale(language: string) {
  return language.startsWith("lt") ? lt : enGB;
}

/** "−12.34 EUR" for debits, "+12.34 EUR" for credits. */
export function formatSignedAmount(amount: number, currency: string, direction: BankDirection): string {
  const sign = direction === "debit" ? "−" : "+";
  return `${sign}${Math.abs(amount).toFixed(2)} ${currency}`;
}

/** "5 minutes ago" / "prieš 5 minutes". */
export function formatRelative(iso: string, language: string): string {
  return formatDistanceToNow(parseISO(iso), { addSuffix: true, locale: locale(language) });
}

/** Day heading for the Inbox groups: "Friday, 30 October". */
export function formatDayHeading(date: string, language: string): string {
  return format(parseISO(date), language.startsWith("lt") ? "MMMM d 'd.', EEEE" : "EEEE, d MMMM", {
    locale: locale(language),
  });
}

/** "30 Oct 2026" style date for consent expiry. */
export function formatShortDate(iso: string, language: string): string {
  return format(parseISO(iso), "PP", { locale: locale(language) });
}

/** Whole days until an ISO timestamp (negative once past). */
export function daysUntil(iso: string): number {
  return differenceInCalendarDays(parseISO(iso), new Date());
}
