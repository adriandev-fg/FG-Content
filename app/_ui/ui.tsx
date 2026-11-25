import Link from "next/link";
import type { ReactNode } from "react";
import type { Dict } from "@/lib/i18n/en";
import { STATUS_TONE } from "@/lib/content/status";
import type { Format, Platform, Status } from "@/lib/content/types";

/** Shared look. Buttons are 44px tall on touch (tap targets), 40px from sm up. */
export const btn = {
  primary:
    "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-fg px-4 text-sm font-semibold text-ground transition hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-50 sm:h-10",
  accent:
    "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-accent-ink px-4 text-sm font-semibold text-ground transition hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-50 sm:h-10",
  outline:
    "inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-line-bright bg-raised px-4 text-sm font-semibold text-fg transition hover:border-fg disabled:cursor-not-allowed disabled:opacity-50 sm:h-10",
  ghost: "inline-flex h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold text-fg-muted transition hover:bg-sunk hover:text-fg disabled:opacity-50 sm:h-10",
  danger: "inline-flex h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold text-bad transition hover:bg-bad-soft disabled:opacity-50 sm:h-10",
  link: "font-semibold text-accent-ink underline-offset-2 hover:underline",
};

export const input =
  "h-11 w-full rounded-lg border border-line-bright bg-raised px-3 text-[15px] text-fg outline-none transition placeholder:text-fg-dim focus:border-fg focus:ring-4 focus:ring-accent/15 sm:h-10";
export const textarea =
  "min-h-24 w-full resize-y rounded-lg border border-line-bright bg-raised px-3 py-2 text-[15px] text-fg outline-none transition placeholder:text-fg-dim focus:border-fg focus:ring-4 focus:ring-accent/15";
export const card = "rounded-xl border border-line bg-raised";
export const label = "text-[13px] font-semibold text-fg";
export const hint = "text-[13px] text-fg-dim";

export function PageHeader({ title, intro, actions, eyebrow }: { title: string; intro?: string; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
      <div className="min-w-0 max-w-2xl">
        {eyebrow && <div className="mb-2 text-[13px] font-semibold text-fg-dim">{eyebrow}</div>}
        <h1 className="font-display text-page font-[800] break-words">{title}</h1>
        {intro && <p className="mt-2 text-[15px] text-fg-muted">{intro}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Field({ label: text, hint: help, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={htmlFor} className={label}>
        {text}
      </label>
      {children}
      {help && <p className={hint}>{help}</p>}
    </div>
  );
}

export function StatusBadge({ status, t, client }: { status: Status; t: Dict; client?: boolean }) {
  return (
    <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold whitespace-nowrap ${STATUS_TONE[status]}`}>
      {client ? t.clientStatuses[status] : t.statuses[status]}
    </span>
  );
}

export function FormatTag({ format, t }: { format: Format; t: Dict }) {
  return <span className="text-[13px] font-semibold text-fg">{t.formats[format]}</span>;
}

/** Platform initials in small squares: compact in a table row, the full name for screen readers. */
const PLATFORM_SHORT: Record<Platform, string> = { instagram: "IG", tiktok: "TT", facebook: "FB" };
export function Platforms({ platforms, t }: { platforms: Platform[]; t: Dict }) {
  if (platforms.length === 0) return <span className="text-fg-dim">-</span>;
  return (
    <span className="inline-flex gap-1">
      {platforms.map((p) => (
        <abbr key={p} title={t.platforms[p]} className="inline-grid h-6 min-w-7 place-items-center rounded-md border border-line px-1 text-[11px] font-bold tracking-wide text-fg-muted no-underline">
          {PLATFORM_SHORT[p]}
          <span className="sr-only">{t.platforms[p]}</span>
        </abbr>
      ))}
    </span>
  );
}

export function EmptyState({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <div className={`${card} grid place-items-center gap-4 px-6 py-14 text-center`}>
      <p className="max-w-sm text-[15px] text-fg-muted">{text}</p>
      {action}
    </div>
  );
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-[13px] font-semibold text-fg-muted hover:text-fg">
      <span aria-hidden>←</span> {children}
    </Link>
  );
}

export function FormError({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">
      {message}
    </p>
  );
}
