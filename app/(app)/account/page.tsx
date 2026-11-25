import type { Metadata } from "next";
import { requireViewer } from "@/lib/auth";
import { getI18n } from "@/lib/i18n";
import { LanguageSwitch } from "@/app/_ui/language-switch";
import { card, label, PageHeader } from "@/app/_ui/ui";
import { NameForm, PasswordForm } from "./forms";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t.account.title };
}

export default async function AccountPage() {
  const viewer = await requireViewer();
  const { t } = await getI18n();
  return (
    <>
      <PageHeader title={t.account.title} intro={t.account.intro} />
      <div className="grid max-w-3xl gap-5">
        <section className={`${card} grid gap-5 p-5 sm:p-6`}>
          <div className="grid gap-1">
            <span className={label}>{t.account.email}</span>
            <span className="text-[15px]">{viewer.email}</span>
          </div>
          <NameForm name={viewer.name} />
          <div className="grid gap-1.5">
            <span className={label}>{t.account.language}</span>
            <LanguageSwitch />
          </div>
        </section>
        <section className={`${card} p-5 sm:p-6`}>
          <h2 className="mb-4 text-lg font-[800] tracking-tight">{t.account.changePassword}</h2>
          <PasswordForm />
        </section>
      </div>
    </>
  );
}
