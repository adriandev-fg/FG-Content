import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listBusinesses } from "@/lib/data";
import { isIsoDay } from "@/lib/dates";
import { getI18n } from "@/lib/i18n";
import { BackLink, btn, EmptyState, PageHeader } from "@/app/_ui/ui";
import { NewContentForm } from "./form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t.newContent.title };
}

export default async function NewContentPage({ searchParams }: { searchParams: Promise<{ business?: string; date?: string }> }) {
  await requireAdmin();
  const { t } = await getI18n();
  const sp = await searchParams;
  const businesses = await listBusinesses();
  return (
    <>
      <div className="mb-4">
        <BackLink href="/content">{t.nav.content}</BackLink>
      </div>
      <PageHeader title={t.newContent.title} intro={t.newContent.intro} />
      {businesses.length === 0 ? (
        <EmptyState
          text={t.newContent.needBusiness}
          action={
            <Link href="/businesses" className={btn.primary}>
              {t.businesses.new}
            </Link>
          }
        />
      ) : (
        <NewContentForm businesses={businesses.map((b) => ({ id: b.id, name: b.name }))} businessId={businesses.some((b) => b.id === sp.business) ? sp.business! : businesses.length === 1 ? businesses[0].id : ""} date={isIsoDay(sp.date) ? sp.date : ""} />
      )}
    </>
  );
}
