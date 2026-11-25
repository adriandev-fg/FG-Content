import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n";
import { currentUserId } from "@/lib/auth";
import { LanguageSwitch } from "@/app/_ui/language-switch";
import { LoginForm } from "./login-form";
import { signOut } from "@/app/actions/session";
import { btn } from "@/app/_ui/ui";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.login.title };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; denied?: string }> }) {
  const { t } = await getI18n();
  const sp = await searchParams;
  const denied = sp.denied === "1" && Boolean(await currentUserId());

  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* The brand panel: the deep band from the Fast Growth site. Hidden on phones, where the form comes first. */}
      <section className="relative hidden flex-col justify-between overflow-hidden bg-deep p-10 text-on-deep lg:flex xl:p-14">
        <img src="/mark-reversed.svg" alt="Fast Growth" width={40} height={40} className="size-10" />
        <div className="max-w-md">
          <p className="font-display text-[clamp(2.25rem,3.2vw,3.25rem)] leading-[1.02] font-[800] tracking-[-0.035em]">
            {t.login.intro}
          </p>
          <ul className="mt-10 grid gap-3 text-[15px] text-on-deep-muted">
            {[t.comments.guide1, t.comments.guide2, t.comments.guide3].map((s, i) => (
              <li key={s} className="flex gap-3">
                <span className="tabular mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border border-line-deep text-xs font-bold text-accent">{i + 1}</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-[13px] text-on-deep-muted">Fast Growth</p>
      </section>

      <section className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <img src="/lockup.svg" alt="Fast Growth" width={132} height={28} className="h-7 w-auto lg:invisible" />
          <LanguageSwitch />
        </div>
        <div className="mx-auto grid w-full max-w-sm flex-1 content-center gap-6 py-12">
          <div>
            <h1 className="font-display text-page font-[800]">{t.login.title}</h1>
            <p className="mt-2 text-[15px] text-fg-muted lg:hidden">{t.login.intro}</p>
          </div>
          {denied ? (
            <div className="grid gap-4">
              <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">
                {t.login.noAccess}
              </p>
              <form action={signOut}>
                <button className={btn.outline}>{t.login.signOut}</button>
              </form>
            </div>
          ) : (
            <LoginForm next={sp.next ?? "/"} />
          )}
        </div>
      </section>
    </main>
  );
}
