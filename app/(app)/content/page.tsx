import type { Metadata } from "next";
import Link from "next/link";
import { requireViewer } from "@/lib/auth";
import { listBusinesses, listContent, parseFilters } from "@/lib/data";
import { STATUS_ORDER } from "@/lib/content/status";
import { FORMATS, PLATFORMS } from "@/lib/content/types";
import { fill } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n";
import { ContentList } from "@/app/_ui/content-list";
import { Filters, type FilterDef } from "@/app/_ui/filters";
import { Icon } from "@/app/_ui/icons";
import { btn, EmptyState, PageHeader } from "@/app/_ui/ui";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t.content.title };
}

export default async function ContentIndex({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const viewer = await requireViewer();
  const { t, locale } = await getI18n();
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const isAdmin = viewer.role === "admin";
  const [rows, businesses] = await Promise.all([listContent(viewer, filters), isAdmin ? listBusinesses() : Promise.resolve([])]);
  // What needs someone first, then by date.
  rows.sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || (a.publish_on ?? "9999").localeCompare(b.publish_on ?? "9999"));

  const statuses = isAdmin ? STATUS_ORDER : STATUS_ORDER.filter((s) => s !== "draft");
  const defs: FilterDef[] = [
    ...(isAdmin ? [{ name: "business", label: t.common.business, allLabel: t.common.allBusinesses, options: businesses.map((b) => ({ value: b.id, label: b.name })) }] : []),
    { name: "status", label: t.content.filterStatus, allLabel: t.common.all, options: statuses.map((s) => ({ value: s, label: isAdmin ? t.statuses[s] : t.clientStatuses[s] })) },
    { name: "format", label: t.content.filterFormat, allLabel: t.common.all, options: FORMATS.map((f) => ({ value: f, label: t.formats[f] })) },
    { name: "platform", label: t.content.filterPlatform, allLabel: t.common.all, options: PLATFORMS.map((p) => ({ value: p, label: t.platforms[p] })) },
  ];
  const filtered = Boolean(filters.businessId || filters.status || filters.format || filters.platform);
  const newHref = `/content/new${filters.businessId ? `?business=${filters.businessId}` : ""}`;

  return (
    <>
      <PageHeader
        title={t.content.title}
        intro={isAdmin ? t.content.intro : t.content.introClient}
        actions={
          isAdmin && (
            <Link href={newHref} className={btn.accent}>
              <Icon name="plus" size={16} /> {t.content.newContent}
            </Link>
          )
        }
      />
      <Filters filters={defs} />
      {rows.length === 0 ? (
        <EmptyState
          text={filtered ? t.content.emptyFiltered : t.content.empty}
          action={
            isAdmin && !filtered ? (
              <Link href={newHref} className={btn.primary}>
                {t.content.newContent}
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <ContentList rows={rows} t={t} locale={locale} client={!isAdmin} showBusiness={isAdmin && !filters.businessId} />
          <p className="tabular mt-3 text-[13px] text-fg-dim">{fill(t.content.count, { n: rows.length })}</p>
        </>
      )}
    </>
  );
}
