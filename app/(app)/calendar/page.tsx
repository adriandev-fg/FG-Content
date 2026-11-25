import type { Metadata } from "next";
import Link from "next/link";
import { requireViewer } from "@/lib/auth";
import { listBusinesses, listContent } from "@/lib/data";
import { addDays, fmtDay, isoDay, today } from "@/lib/dates";
import { STATUS_DOT, STATUS_ORDER } from "@/lib/content/status";
import type { ContentRow } from "@/lib/content/types";
import { fill } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n";
import { Filters } from "@/app/_ui/filters";
import { Icon } from "@/app/_ui/icons";
import { btn, card, PageHeader, Platforms, StatusBadge } from "@/app/_ui/ui";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t.calendar.title };
}

const MAX_PER_DAY = 3;

/** A month of publish dates. Weeks start on Monday. A grid from md up, a day-by-day list on a phone. */
export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string; business?: string }> }) {
  const viewer = await requireViewer();
  const { t, locale } = await getI18n();
  const sp = await searchParams;
  const isAdmin = viewer.role === "admin";
  const now = today();

  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.month ?? "") ? sp.month! : now.slice(0, 7);
  const first = `${month}-01`;
  const firstDate = new Date(`${first}T00:00:00Z`);
  const lead = (firstDate.getUTCDay() + 6) % 7; // days before the 1st in a Monday week
  const gridStart = addDays(first, -lead);
  const nextMonthFirst = isoDay(new Date(Date.UTC(firstDate.getUTCFullYear(), firstDate.getUTCMonth() + 1, 1)));
  const prevMonth = isoDay(new Date(Date.UTC(firstDate.getUTCFullYear(), firstDate.getUTCMonth() - 1, 1))).slice(0, 7);
  const lastOfMonth = addDays(nextMonthFirst, -1);
  const trail = (7 - ((lead + Number(lastOfMonth.slice(8))) % 7)) % 7;
  const gridEnd = addDays(lastOfMonth, trail);

  const businessId = isAdmin && sp.business && /^[0-9a-f-]{36}$/i.test(sp.business) ? sp.business : undefined;
  const [rows, undated, businesses] = await Promise.all([
    listContent(viewer, { businessId, from: gridStart, to: gridEnd }),
    listContent(viewer, { businessId, dated: false }),
    isAdmin ? listBusinesses() : Promise.resolve([]),
  ]);

  const byDay = new Map<string, ContentRow[]>();
  for (const r of rows) byDay.set(r.publish_on!, [...(byDay.get(r.publish_on!) ?? []), r]);
  for (const list of byDay.values()) list.sort((a, b) => (a.publish_time ?? "99").localeCompare(b.publish_time ?? "99"));

  const days: string[] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(d);
  const keep = (m: string) => `/calendar?month=${m}${businessId ? `&business=${businessId}` : ""}`;
  const newHref = (d: string) => `/content/new?date=${d}${businessId ? `&business=${businessId}` : ""}`;
  const monthLabel = fmtDay(first, locale, { month: "long", year: "numeric" });
  const monthDays = days.filter((d) => d.startsWith(month) && byDay.has(d));

  return (
    <>
      <PageHeader title={t.calendar.title} intro={t.calendar.intro} />
      {isAdmin && <Filters filters={[{ name: "business", label: t.common.business, allLabel: t.common.allBusinesses, options: businesses.map((b) => ({ value: b.id, label: b.name })) }]} />}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Link href={keep(prevMonth)} aria-label={t.calendar.prev} className={`${btn.ghost} w-11 px-0 sm:w-10`}>
            <Icon name="chevronL" />
          </Link>
          <Link href={keep(nextMonthFirst.slice(0, 7))} aria-label={t.calendar.next} className={`${btn.ghost} w-11 px-0 sm:w-10`}>
            <Icon name="chevronR" />
          </Link>
          <h2 className="ml-2 text-xl font-[800] tracking-tight first-letter:uppercase">{monthLabel}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ul className="hidden flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted lg:flex" aria-label={t.calendar.legend}>
            {STATUS_ORDER.filter((s) => isAdmin || s !== "draft").map((s) => (
              <li key={s} className="inline-flex items-center gap-1.5">
                <span className={`size-2 rounded-full ${STATUS_DOT[s]}`} />
                {isAdmin ? t.statuses[s] : t.clientStatuses[s]}
              </li>
            ))}
          </ul>
          {month !== now.slice(0, 7) && (
            <Link href={keep(now.slice(0, 7))} className={btn.outline}>
              {t.calendar.today}
            </Link>
          )}
        </div>
      </div>

      {/* Grid: md and up */}
      <div className={`${card} hidden overflow-hidden md:block`}>
        <div className="grid grid-cols-7 border-b border-line bg-sunk/60">
          {t.calendar.weekdays.map((w) => (
            <div key={w} className="px-2 py-2 text-xs font-semibold text-fg-dim">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d, i) => {
            const items = byDay.get(d) ?? [];
            const inMonth = d.startsWith(month);
            const isToday = d === now;
            return (
              <div key={d} className={`group relative min-h-32 min-w-0 overflow-hidden border-line p-1.5 ${i % 7 !== 6 ? "border-r" : ""} ${i < days.length - 7 ? "border-b" : ""} ${inMonth ? "" : "bg-ground/70"}`}>
                <div className="mb-1 flex items-center justify-between px-1">
                  <span className={`tabular grid size-6 place-items-center rounded-full text-xs font-bold ${isToday ? "bg-accent text-deep" : inMonth ? "text-fg" : "text-fg-dim"}`}>{Number(d.slice(8))}</span>
                  {isAdmin && (
                    <Link href={newHref(d)} aria-label={`${t.content.newContent} ${fmtDay(d, locale)}`} className="grid size-6 place-items-center rounded text-fg-dim opacity-0 transition group-hover:opacity-100 hover:bg-sunk hover:text-fg focus:opacity-100">
                      <Icon name="plus" size={14} />
                    </Link>
                  )}
                </div>
                <ul className="grid min-w-0 gap-1">
                  {items.slice(0, MAX_PER_DAY).map((r) => (
                    <li key={r.id}>
                      <Link
                        href={`/content/${r.id}`}
                        title={`${r.title}${isAdmin ? ` · ${r.business_name}` : ""}`}
                        className={`flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-xs transition hover:bg-sunk ${r.status === "published" ? "text-fg-muted" : ""}`}
                      >
                        <span className={`size-2 shrink-0 rounded-full ${STATUS_DOT[r.status]}`} />
                        <span className="truncate font-semibold">{r.title}</span>
                      </Link>
                    </li>
                  ))}
                  {items.length > MAX_PER_DAY && (
                    <li>
                      <Link href={`/content?${businessId ? `business=${businessId}&` : ""}`} className="block px-1.5 text-xs font-semibold text-fg-dim hover:text-fg">
                        {fill(t.calendar.more, { n: items.length - MAX_PER_DAY })}
                      </Link>
                    </li>
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* Agenda: phone */}
      <div className="grid gap-4 md:hidden">
        {monthDays.length === 0 && <p className={`${card} px-5 py-8 text-center text-sm text-fg-muted`}>{t.content.empty}</p>}
        {monthDays.map((d) => (
          <section key={d}>
            <h3 className={`mb-1.5 text-[13px] font-bold first-letter:uppercase ${d === now ? "text-accent-ink" : "text-fg-muted"}`}>{fmtDay(d, locale, { weekday: "long", day: "numeric", month: "long" })}</h3>
            <ul className={`${card} divide-y divide-line`}>
              {byDay.get(d)!.map((r) => (
                <li key={r.id}>
                  <Link href={`/content/${r.id}`} className="flex items-center gap-3 px-4 py-3">
                    <span className={`size-2.5 shrink-0 rounded-full ${STATUS_DOT[r.status]}`} />
                    <span className="grid min-w-0 flex-1 gap-0.5">
                      <span className="truncate font-semibold">{r.title}</span>
                      <span className="flex items-center gap-2 text-[13px] text-fg-muted">
                        {r.publish_time && <span className="tabular">{r.publish_time}</span>}
                        {isAdmin && <span className="truncate">{r.business_name}</span>}
                        <Platforms platforms={r.platforms} t={t} />
                      </span>
                    </span>
                    <StatusBadge status={r.status} t={t} client={!isAdmin} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {undated.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xs font-bold tracking-[0.08em] text-fg-dim uppercase">{t.calendar.noDate}</h2>
          {isAdmin && <p className="mt-1 text-[13px] text-fg-dim">{t.calendar.noDateHint}</p>}
          <ul className="mt-3 flex flex-wrap gap-2">
            {undated.map((r) => (
              <li key={r.id}>
                <Link href={`/content/${r.id}`} className={`${card} inline-flex max-w-xs items-center gap-2 px-3 py-2 text-[13px] transition hover:border-fg`}>
                  <span className={`size-2 shrink-0 rounded-full ${STATUS_DOT[r.status]}`} />
                  <span className="truncate font-semibold">{r.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
