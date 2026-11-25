import "@fontsource-variable/archivo";
import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getI18n } from "@/lib/i18n";
import { I18nProvider } from "@/lib/i18n/client";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: { default: t.meta.title, template: `%s · ${t.meta.title}` }, description: t.meta.description, robots: { index: false, follow: false } };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const { locale, t } = await getI18n();
  return (
    <html lang={locale}>
      <body className="min-h-dvh antialiased">
        <I18nProvider locale={locale} t={t}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
