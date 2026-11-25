import type { Metadata } from "next";
import Link from "next/link";
import { requireViewer } from "@/lib/auth";
import { listContent } from "@/lib/data";
import { addDays, fmtDay, today } from "@/lib/dates";
import type { ContentRow } from "@/lib/content/types";
import { fill, type Locale } from "@/lib/i18n/config";
import type { Dict } from "@/lib/i18n/en";
import { getI18n } from "@/lib/i18n";
import { Icon } from "@/app/_ui/icons";
import { btn, card, FormatTag, Platforms, PageHeader, StatusBadge } from "@/app/_ui/ui";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t.nav.overview };
}

/** What needs someone now, and what goes out next. */
export default async function Overview() {
  const viewer = await requireViewer();
  const { t, locale } = await getI18n();
  const rows = await listContent(viewer);
  const isAdmin = viewer.role === "admin";
  const day = today();
  const in7 = addDays(day, 7);
  const in14 = addDays(day, 14);

  const byStatus = (s: ContentRow["status"]) => rows.filter((r) => r.status === s);
  const upcoming = rows.filter((r) => r.publish_on && r.publish_on >= day && r.publish_on <= in14 && r.status !== "published");
  const attention = isAdmin ? byStatus("changes_requested") : byStatus("in_review");

  const tiles = isAdmin
    ? [
        { label: t.overview.needsTeam, hint: t.overview.needsTeamHint, n: byStatus("changes_requested").length, href: "/content?status=changes_requested", hot: true },
        { label: t.overview.waitingClient, hint: t.overview.waitingClientHint, n: byStatus("in_review").length, href: "/content?status=in_review" },
        { label: t.overview.approved, hint: t.overview.approvedHint, n: byStatus("approved").length, href: "/content?status=approved" },
        { label: t.overview.thisWeek, hint: t.overview.thisWeekHint, n: upcoming.filter((r) => r.publish_on! <= in7).length, href: "/calendar" },
      ]
    : [
        { label: t.overview.waitingYou, hint: t.overview.waitingYouHint, n: byStatus("in_review").length, href: "/content?status=in_review", hot: true },
        { label: t.overview.approved, hint: t.overview.approvedHint, n: byStatus("approved").length, href: "/content?status=approved" },
        { label: t.overview.thisWeek, hint: t.overview.thisWeekHint, n: upcoming.filter((r) => r.publish_on! <= in7).length, href: "/calendar" },
      ];

  const firstName = (viewer.name || viewer.email.split("@")[0]).split(" ")[0];

  return (
    <>
      <PageHeader
        eyebrow={viewer.businessName ?? undefined}
        title={isAdmin ? t.overview.titleAdmin : fill(t.overview.titleClient, { name: firstName })}
        intro={isAdmin ? t.overview.introAdmin : t.overview.introClient}
        actions={
          isAdmin && (
            <Link href="/content/new" className={btn.accent}>
              <Icon name="plus" size={16} /> {t.overview.newContent}
            </Link>
          )
        }
      />

      <div className={`grid grid-cols-2 gap-3 ${isAdmin ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        {tiles.map((tile) => (
          <Link key={tile.label} href={tile.href} className={`${card} group grid gap-3 p-4 transition hover:border-fg sm:p-5`}>
            <span className="text-[13px] font-semibold text-fg-muted">{tile.label}</span>
            <span className={`tabular font-display text-stat font-[800] ${tile.hot && tile.n > 0 ? "text-accent-ink" : ""}`}>{tile.n}</span>
            <span className="text-xs text-fg-dim">{tile.hint}</span>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-xs font-bold tracking-[0.08em] text-fg-dim uppercase">{t.overview.attention}</h2>
          {attention.length === 0 ? (
            <p className={`${card} px-5 py-8 text-center text-sm text-fg-muted`}>{t.overview.noAttention}</p>
          ) : (
            <ul className={`${card} divide-y divide-line`}>
              {attention.slice(0, 8).map((r) => (
                <Row key={r.id} row={r} t={t} locale={locale} isAdmin={isAdmin} action={t.overview.reviewNow} />
              ))}
            </ul>
          )}
        </section>
        <section>
          <h2 className="mb-3 text-xs font-bold tracking-[0.08em] text-fg-dim uppercase">{t.overview.upcoming}</h2>
          {upcoming.length === 0 ? (
            <p className={`${card} px-5 py-8 text-center text-sm text-fg-muted`}>{t.overview.noUpcoming}</p>
          ) : (
            <ul className={`${card} divide-y divide-line`}>
              {upcoming.slice(0, 10).map((r) => (
                <Row key={r.id} row={r} t={t} locale={locale} isAdmin={isAdmin} dated />
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function Row({ row, t, locale, isAdmin, action, dated }: { row: ContentRow; t: Dict; locale: Locale; isAdmin: boolean; action?: string; dated?: boolean }) {
  return (
    <li>
      <Link href={`/content/${row.id}`} className="group flex items-center gap-4 px-4 py-3 transition hover:bg-ground">
        {dated && row.publish_on && (
          <span className="tabular grid w-11 shrink-0 text-center leading-none">
            <span className="text-[11px] font-bold text-fg-dim uppercase">{fmtDay(row.publish_on, locale, { weekday: "short" })}</span>
            <span className="mt-1 text-xl font-[800]">{fmtDay(row.publish_on, locale, { day: "numeric" })}</span>
          </span>
        )}
        <span className="grid min-w-0 flex-1 gap-1">
          <span className="truncate font-semibold group-hover:text-accent-ink">{row.title}</span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-fg-muted">
            {isAdmin && <span className="truncate">{row.business_name}</span>}
            <FormatTag format={row.format} t={t} />
            <Platforms platforms={row.platforms} t={t} />
            {row.open_comments > 0 && (
              <span className="inline-flex items-center gap-1 font-semibold text-accent-ink">
                <Icon name="chat" size={13} /> {row.open_comments}
              </span>
            )}
          </span>
        </span>
        {action ? <span className="hidden text-[13px] font-semibold text-accent-ink sm:inline">{action} →</span> : <StatusBadge status={row.status} t={t} client={!isAdmin} />}
      </Link>
    </li>
  );
}
