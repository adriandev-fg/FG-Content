import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { DEFAULT_LOCALE, isLocale, LANG_COOKIE, type Locale } from "./config";
import { en, type Dict } from "./en";
import { pl } from "./pl";

export const DICTS: Record<Locale, Dict> = { en, pl };

/** The visitor's language: the cookie (set at sign-in and by the switch), else English. */
export const getLocale = cache(async (): Promise<Locale> => {
  const v = (await cookies()).get(LANG_COOKIE)?.value;
  return isLocale(v) ? v : DEFAULT_LOCALE;
});

export async function getI18n(): Promise<{ locale: Locale; t: Dict }> {
  const locale = await getLocale();
  return { locale, t: DICTS[locale] };
}
