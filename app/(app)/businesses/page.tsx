import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listBusinesses } from "@/lib/data";
import { getI18n } from "@/lib/i18n";
import { BusinessForm } from "@/app/_ui/business-form";
import { card, EmptyState, PageHeader } from "@/app/_ui/ui";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t.businesses.title };
}

export default async function BusinessesPage({ searchParams }: { searchParams: Promise<{ archived?: string }> }) {
  await requireAdmin();
  const { t } = await getI18n();
  const showArchived = (await searchParams).archived === "1";
  const businesses = await listBusinesses(showArchived);

  return (
    <>
      <PageHeader title={t.businesses.title} intro={t.businesses.intro} />
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-3">
          {businesses.length === 0 ? (
            <EmptyState text={t.businesses.empty} />
          ) : (
            <div className={`${card} overflow-x-auto`}>
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b border-line bg-sunk/60 text-xs text-fg-dim">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">{t.businesses.colName}</th>
                    <th className="px-3 py-2.5 text-right font-semibold">{t.businesses.colContent}</th>
                    <th className="px-3 py-2.5 text-right font-semibold">{t.businesses.colWaiting}</th>
                    <th className="px-3 py-2.5 text-right font-semibold">{t.businesses.colChanges}</th>
                    <th className="px-4 py-2.5 text-right font-semibold">{t.businesses.colUsers}</th>
                  </tr>
                </thead>
                <tbody className="tabular divide-y divide-line">
                  {businesses.map((b) => (
                    <tr key={b.id} className="group relative hover:bg-ground">
                      <td className="px-4 py-3">
                        <Link href={`/businesses/${b.id}`} className="font-semibold after:absolute after:inset-0 group-hover:text-accent-ink">
                          {b.name}
                        </Link>
                        {b.archived_at && <span className="ml-2 rounded-full bg-sunk px-2 py-0.5 text-xs text-fg-muted">{t.businesses.archived}</span>}
                      </td>
                      <td className="px-3 py-3 text-right">{b.content}</td>
                      <td className="px-3 py-3 text-right">{b.waiting || <span className="text-fg-dim">-</span>}</td>
                      <td className="px-3 py-3 text-right">{b.changes ? <span className="font-bold text-accent-ink">{b.changes}</span> : <span className="text-fg-dim">-</span>}</td>
                      <td className="px-4 py-3 text-right">{b.logins}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Link href={showArchived ? "/businesses" : "/businesses?archived=1"} className="justify-self-start text-[13px] font-semibold text-fg-dim hover:text-fg">
            {showArchived ? t.common.back : `${t.businesses.archived} →`}
          </Link>
        </div>
        <section className={`${card} p-5 sm:p-6`}>
          <h2 className="mb-4 text-lg font-[800] tracking-tight">{t.businesses.new}</h2>
          <BusinessForm />
        </section>
      </div>
    </>
  );
}
