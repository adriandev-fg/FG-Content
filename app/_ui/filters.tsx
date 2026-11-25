"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { useI18n } from "@/lib/i18n/client";

export type FilterDef = { name: string; label: string; options: { value: string; label: string }[]; allLabel: string };

/** Select filters kept in the URL, so a filtered list can be shared or bookmarked. */
export function Filters({ filters }: { filters: FilterDef[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const set = (name: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(name, value);
    else next.delete(name);
    start(() => router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
  };
  const active = filters.some((f) => params.get(f.name));
  return (
    <div className={`mb-5 flex flex-wrap items-end gap-2 ${pending ? "opacity-70" : ""}`}>
      {filters.map((f) => (
        <label key={f.name} className="grid gap-1">
          <span className="text-xs font-semibold text-fg-dim">{f.label}</span>
          <select
            value={params.get(f.name) ?? ""}
            onChange={(e) => set(f.name, e.target.value)}
            className={`h-11 max-w-56 rounded-lg border bg-raised px-2.5 text-[13px] font-semibold sm:h-10 ${params.get(f.name) ? "border-fg" : "border-line-bright"}`}
          >
            <option value="">{f.allLabel}</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      ))}
      {active && (
        <button type="button" onClick={() => start(() => router.replace(pathname, { scroll: false }))} className="h-11 px-2 text-[13px] font-semibold text-accent-ink hover:underline sm:h-10">
          {t.content.clearFilters}
        </button>
      )}
    </div>
  );
}
