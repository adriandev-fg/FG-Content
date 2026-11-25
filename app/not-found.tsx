import Link from "next/link";
import { getI18n } from "@/lib/i18n";
import { btn } from "./_ui/ui";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <main className="grid min-h-dvh place-items-center px-5">
      <div className="grid max-w-sm justify-items-center gap-4 text-center">
        <p className="tabular font-display text-[5rem] leading-none font-[800] tracking-tight text-accent">404</p>
        <p className="text-[15px] text-fg-muted">{t.common.notAllowed}</p>
        <Link href="/" className={btn.primary}>
          {t.nav.overview}
        </Link>
      </div>
    </main>
  );
}
