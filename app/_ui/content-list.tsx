import Link from "next/link";
import type { ContentRow } from "@/lib/content/types";
import { fmtDay } from "@/lib/dates";
import type { Locale } from "@/lib/i18n/config";
import { fill } from "@/lib/i18n/config";
import type { Dict } from "@/lib/i18n/en";
import { Icon } from "./icons";
import { card, FormatTag, Platforms, StatusBadge } from "./ui";

/** Content as a table from md up, as cards on a phone. `showBusiness` for the admin's all-businesses view. */
export function ContentList({ rows, t, locale, client, showBusiness }: { rows: ContentRow[]; t: Dict; locale: Locale; client: boolean; showBusiness: boolean }) {
  const date = (r: ContentRow) => (r.publish_on ? `${fmtDay(r.publish_on, locale, { weekday: "short", day: "numeric", month: "short" })}${r.publish_time ? ` · ${r.publish_time}` : ""}` : t.common.noDate);
  return (
    <>
      <div className={`${card} hidden overflow-hidden md:block`}>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-sunk/60 text-xs font-semibold text-fg-dim">
            <tr>
              <th className="px-4 py-2.5 font-semibold">{t.content.colTitle}</th>
              <th className="px-3 py-2.5 font-semibold">{t.content.colFormat}</th>
              <th className="px-3 py-2.5 font-semibold">{t.content.colPlatforms}</th>
              <th className="px-3 py-2.5 font-semibold">{t.content.colDate}</th>
              <th className="px-3 py-2.5 font-semibold">{t.content.colStatus}</th>
              <th className="px-4 py-2.5 text-right font-semibold">
                <span className="sr-only">{t.content.colComments}</span>
                <Icon name="chat" size={15} className="ml-auto" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id} className="group relative transition hover:bg-ground">
                <td className="max-w-0 px-4 py-3 lg:w-[42%]">
                  <Link href={`/content/${r.id}`} className="block truncate font-semibold after:absolute after:inset-0 group-hover:text-accent-ink">
                    {r.title}
                  </Link>
                  {showBusiness && <span className="block truncate text-[13px] text-fg-dim">{r.business_name}</span>}
                </td>
                <td className="px-3 py-3">
                  <FormatTag format={r.format} t={t} />
                </td>
                <td className="px-3 py-3">
                  <Platforms platforms={r.platforms} t={t} />
                </td>
                <td className="tabular px-3 py-3 whitespace-nowrap text-fg-muted">{date(r)}</td>
                <td className="px-3 py-3">
                  <StatusBadge status={r.status} t={t} client={client} />
                </td>
                <td className="tabular px-4 py-3 text-right font-semibold">{r.open_comments > 0 ? <span className="text-accent-ink">{r.open_comments}</span> : <span className="text-fg-dim">-</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="grid gap-2 md:hidden">
        {rows.map((r) => (
          <li key={r.id}>
            <Link href={`/content/${r.id}`} className={`${card} grid gap-2 p-4 active:bg-sunk`}>
              <div className="flex items-start justify-between gap-3">
                <span className="min-w-0 font-semibold">{r.title}</span>
                <StatusBadge status={r.status} t={t} client={client} />
              </div>
              {showBusiness && <span className="text-[13px] text-fg-dim">{r.business_name}</span>}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-fg-muted">
                <FormatTag format={r.format} t={t} />
                <Platforms platforms={r.platforms} t={t} />
                <span className="tabular">{date(r)}</span>
                {r.open_comments > 0 && <span className="font-semibold text-accent-ink">{fill(t.content.openComments, { n: r.open_comments })}</span>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
