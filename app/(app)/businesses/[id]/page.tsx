import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setBusinessArchived } from "@/app/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { getBusiness, listBusinesses, listProfiles } from "@/lib/data";
import { getI18n } from "@/lib/i18n";
import { BusinessForm } from "@/app/_ui/business-form";
import { Icon } from "@/app/_ui/icons";
import { UserForm } from "@/app/_ui/user-form";
import { UserTable } from "@/app/_ui/user-table";
import { BackLink, btn, card, PageHeader } from "@/app/_ui/ui";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  await requireAdmin();
  return { title: (await getBusiness((await params).id))?.name ?? "Business" };
}

export default async function BusinessPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireAdmin();
  const { t } = await getI18n();
  const id = (await params).id;
  const business = await getBusiness(id);
  if (!business) notFound();
  const [profiles, summaries] = await Promise.all([listProfiles(id), listBusinesses(true)]);
  const summary = summaries.find((s) => s.id === id);
  const archive = setBusinessArchived.bind(null, id, !business.archived_at);

  return (
    <>
      <div className="mb-4">
        <BackLink href="/businesses">{t.businesses.title}</BackLink>
      </div>
      <PageHeader
        title={business.name}
        intro={summary ? `${t.businesses.colContent}: ${summary.content} · ${t.businesses.colWaiting}: ${summary.waiting} · ${t.businesses.colChanges}: ${summary.changes}` : undefined}
        actions={
          <>
            <Link href={`/content?business=${id}`} className={btn.outline}>
              {t.businesses.contentLink}
            </Link>
            <Link href={`/calendar?business=${id}`} className={btn.outline}>
              <Icon name="calendar" size={16} /> {t.businesses.calendarLink}
            </Link>
            <Link href={`/content/new?business=${id}`} className={btn.accent}>
              <Icon name="plus" size={16} /> {t.content.newContent}
            </Link>
          </>
        }
      />
      <div className="grid items-start gap-8 lg:grid-cols-2">
        <section className="grid gap-3">
          <div>
            <h2 className="text-lg font-[800] tracking-tight">{t.businesses.logins}</h2>
            <p className="text-[13px] text-fg-dim">{t.businesses.loginsHint}</p>
          </div>
          <UserTable users={profiles.map((p) => ({ ...p, business_name: business.name }))} me={viewer.id} />
          <div className={`${card} p-5 sm:p-6`}>
            <h3 className="mb-4 text-[15px] font-bold">{t.users.new}</h3>
            <UserForm businesses={[]} businessId={id} />
          </div>
        </section>
        <section className={`${card} grid gap-6 p-5 sm:p-6`}>
          <BusinessForm business={business} />
          <form action={archive} className="grid gap-2 border-t border-line pt-5">
            <p className="text-[13px] text-fg-dim">{t.businesses.archiveHint}</p>
            <button className={`${business.archived_at ? btn.outline : btn.danger} justify-self-start`}>{business.archived_at ? t.businesses.unarchive : t.businesses.archive}</button>
          </form>
        </section>
      </div>
    </>
  );
}
