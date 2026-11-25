"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { signOut } from "@/app/actions/session";
import { Icon, type IconName } from "@/app/_ui/icons";
import { LanguageSwitch } from "@/app/_ui/language-switch";
import { useI18n } from "@/lib/i18n/client";

type Item = { href: string; key: "overview" | "content" | "calendar" | "businesses" | "users" | "account"; icon: IconName; badge?: number };

/**
 * Desktop: a dark sidebar (the deep band of the Fast Growth site) with the logo, the sections and the
 * user. Phone: a top bar and bottom tabs for the three daily sections, with the rest behind Menu.
 */
export function Shell({ role, name, businessName, attention, children }: { role: "admin" | "client"; name: string; businessName: string | null; attention: number; children: ReactNode }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => setMenuOpen(false), [pathname]);

  const items: Item[] = [
    { href: "/", key: "overview", icon: "overview" },
    { href: "/content", key: "content", icon: "content", badge: attention },
    { href: "/calendar", key: "calendar", icon: "calendar" },
    ...(role === "admin"
      ? ([
          { href: "/businesses", key: "businesses", icon: "businesses" },
          { href: "/users", key: "users", icon: "users" },
        ] as Item[])
      : []),
    { href: "/account", key: "account", icon: "account" },
  ];
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));
  const daily = items.slice(0, 3);
  const rest = items.slice(3);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col bg-deep px-3 py-5 text-on-deep lg:flex">
        <Link href="/" className="mb-1 flex items-center gap-2.5 px-3 py-1">
          <img src="/mark-reversed.svg" alt="" width={28} height={28} className="size-7" />
          <span className="text-[15px] font-[800] tracking-tight">
            Fast Growth <span className="font-semibold text-on-deep-muted">{t.brand}</span>
          </span>
        </Link>
        {businessName && <p className="mx-3 mt-3 truncate rounded-lg bg-deep-raised px-3 py-2 text-[13px] font-semibold">{businessName}</p>}
        <nav className="mt-6 grid gap-0.5">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`group relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition ${
                isActive(item.href) ? "bg-deep-raised text-on-deep" : "text-on-deep-muted hover:bg-deep-raised/60 hover:text-on-deep"
              }`}
            >
              {isActive(item.href) && <span aria-hidden className="absolute top-2 bottom-2 left-0 w-[3px] rounded-full bg-accent" />}
              <Icon name={item.icon} />
              <span className="flex-1">{t.nav[item.key]}</span>
              {Boolean(item.badge) && <span className="tabular grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-deep">{item.badge}</span>}
            </Link>
          ))}
        </nav>
        <div className="mt-auto grid gap-3 border-t border-line-deep px-1 pt-4">
          <p className="truncate px-2 text-[13px] text-on-deep-muted" title={name}>
            {name}
          </p>
          <div className="flex items-center justify-between gap-2">
            <LanguageSwitch tone="dark" />
            <form action={signOut}>
              <button className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-semibold text-on-deep-muted transition hover:text-on-deep">
                <Icon name="out" size={15} />
                {t.nav.signOut}
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Phone and tablet top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-line bg-ground/95 px-4 backdrop-blur lg:hidden">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <img src="/mark.svg" alt="" width={26} height={26} className="size-6.5" />
          <span className="truncate text-sm font-[800] tracking-tight">{businessName ?? `Fast Growth ${t.brand}`}</span>
        </Link>
        <LanguageSwitch />
      </header>

      <main className="min-w-0 px-4 pt-6 pb-28 sm:px-8 lg:px-10 lg:pt-10 lg:pb-16">
        <div className="mx-auto max-w-[1200px]">{children}</div>
      </main>

      {/* Bottom tabs */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-raised pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label={t.nav.menu}>
        {daily.map((item) => (
          <Link key={item.href} href={item.href} aria-current={isActive(item.href) ? "page" : undefined} className={`relative grid h-14 place-items-center content-center gap-0.5 text-[11px] font-semibold ${isActive(item.href) ? "text-fg" : "text-fg-dim"}`}>
            <Icon name={item.icon} size={20} />
            {t.nav[item.key]}
            {Boolean(item.badge) && <span className="tabular absolute top-1.5 left-[calc(50%+6px)] grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-deep">{item.badge}</span>}
            {isActive(item.href) && <span aria-hidden className="absolute top-0 h-[3px] w-8 rounded-b bg-accent" />}
          </Link>
        ))}
        <button type="button" aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)} className={`grid h-14 place-items-center content-center gap-0.5 text-[11px] font-semibold ${rest.some((i) => isActive(i.href)) || menuOpen ? "text-fg" : "text-fg-dim"}`}>
          <Icon name="menu" size={20} />
          {t.nav.menu}
        </button>
      </nav>
      {menuOpen && (
        <div className="fixed inset-0 z-20 bg-deep/30 lg:hidden" onClick={() => setMenuOpen(false)}>
          <div className="absolute inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] grid gap-1 rounded-t-2xl border-t border-line bg-raised p-3" onClick={(e) => e.stopPropagation()}>
            {rest.map((item) => (
              <Link key={item.href} href={item.href} className={`flex h-12 items-center gap-3 rounded-lg px-3 text-[15px] font-semibold ${isActive(item.href) ? "bg-sunk" : ""}`}>
                <Icon name={item.icon} />
                {t.nav[item.key]}
              </Link>
            ))}
            <p className="mt-1 truncate border-t border-line px-3 pt-3 text-[13px] text-fg-dim">{name}</p>
            <form action={signOut}>
              <button className="flex h-12 w-full items-center gap-3 rounded-lg px-3 text-[15px] font-semibold text-fg-muted">
                <Icon name="out" />
                {t.nav.signOut}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
