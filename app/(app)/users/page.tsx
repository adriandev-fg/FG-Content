import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { listBusinesses, listProfiles } from "@/lib/data";
import { getI18n } from "@/lib/i18n";
import { UserForm } from "@/app/_ui/user-form";
import { UserTable } from "@/app/_ui/user-table";
import { card, PageHeader } from "@/app/_ui/ui";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t.users.title };
}

export default async function UsersPage() {
  const viewer = await requireAdmin();
  const { t } = await getI18n();
  const [profiles, businesses] = await Promise.all([listProfiles(), listBusinesses(true)]);
  const names = new Map(businesses.map((b) => [b.id, b.name]));
  return (
    <>
      <PageHeader title={t.users.title} intro={t.users.intro} />
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
        <UserTable users={profiles.map((p) => ({ ...p, business_name: p.business_id ? (names.get(p.business_id) ?? null) : null }))} me={viewer.id} />
        <section className={`${card} p-5 sm:p-6`}>
          <h2 className="mb-4 text-lg font-[800] tracking-tight">{t.users.new}</h2>
          <UserForm businesses={businesses.filter((b) => !b.archived_at).map((b) => ({ id: b.id, name: b.name }))} />
        </section>
      </div>
    </>
  );
}
