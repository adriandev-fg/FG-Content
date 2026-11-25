"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Locale } from "./config";
import type { Dict } from "./en";

const I18nContext = createContext<{ locale: Locale; t: Dict } | null>(null);

/** Hands the server's dictionary to client components (set once in the root layout). */
export function I18nProvider({ locale, t, children }: { locale: Locale; t: Dict; children: ReactNode }) {
  return <I18nContext.Provider value={{ locale, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n outside I18nProvider");
  return ctx;
}
