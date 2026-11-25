import { localeTag, type Locale } from "./i18n/config";

/** Dates are plain calendar days (publish_on is a date column), so no time zone shifts them. */

export const isoDay = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;

/** Today in Warsaw, where the team works. */
export function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return isoDay(d);
}

export function fmtDay(day: string, locale: Locale, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }): string {
  return new Intl.DateTimeFormat(localeTag(locale), { ...opts, timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`));
}

export function fmtDateTime(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(localeTag(locale), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Warsaw" }).format(new Date(iso));
}

export const isIsoDay = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));
export const isTime = (v: unknown): v is string => typeof v === "string" && /^[0-2]\d:[0-5]\d$/.test(v);
