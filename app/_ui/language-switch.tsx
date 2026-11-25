"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLanguage } from "@/app/actions/session";
import { LOCALES } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/client";

/** EN | PL. `tone` matches the ground it sits on (the dark sidebar or the light page). */
export function LanguageSwitch({ tone = "light" }: { tone?: "light" | "dark" }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const base = tone === "dark" ? "text-on-deep-muted hover:text-on-deep" : "text-fg-dim hover:text-fg";
  const active = tone === "dark" ? "bg-deep-raised text-on-deep" : "bg-sunk text-fg";
  return (
    <div role="group" aria-label={t.nav.language} className={`inline-flex gap-0.5 rounded-lg p-0.5 ${pending ? "opacity-60" : ""}`}>
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={l === locale}
          title={t.lang[l]}
          disabled={pending || l === locale}
          onClick={() =>
            start(async () => {
              await setLanguage(l);
              router.refresh();
            })
          }
          className={`h-8 min-w-10 rounded-md px-2 text-xs font-bold tracking-wider uppercase transition ${l === locale ? active : base}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
