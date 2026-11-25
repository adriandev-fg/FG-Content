# FG Content

A portal where the Fast Growth team writes scripts for reels, posts, carousels and stories (Instagram, TikTok, Facebook) and each client reviews them: highlight words to comment, ask for changes, approve. Plus a publishing calendar. English by default, Polish with the switch.

Next.js 16 (App Router, `proxy.ts` instead of middleware) + Supabase (auth + Postgres) + Tiptap + Tailwind v4. Repo `adriandev-fg/FG-Content`, deployed on Vercel (team Fast Growth).

## Access model (read before adding a page)

- **Shared Supabase project with Meristoll** (`fg-sa1iv`). Every table here is prefixed `fgc_`; never touch Meristoll's tables, and never rely on Meristoll's `app_metadata.role`.
- Who may use the app is decided by `fgc_profiles` (`role` admin | client, `business_id` for a client). A Meristoll login without a profile here gets nothing (`lib/auth.ts`, also checked at sign-in in `app/actions/session.ts`).
- Row level security is on with **no policies**: the browser keys can't read anything. Every page loads data on the server with the secret key (`lib/supabase/admin.ts` `db()`), after `requireViewer()` / `requireAdmin()`. Every read goes through `lib/data.ts`, which scopes by viewer: a client gets only their business and never a draft. Every server action checks the viewer again (`actionViewer`). Keep both rules for anything new.
- Admin-only pages call `requireAdmin()` (a client gets a 404).
- No emails: Supabase Auth's site URL belongs to Meristoll. Admins create logins with a password they hand over (`/users`, or a business page); users change it under Account.

## Layout

- `app/(app)/`: signed-in pages with the shell (`shell.tsx`: dark sidebar on desktop, bottom tabs on a phone). Overview `/`, Content `/content` (+ `/content/new`, `/content/[id]`), Calendar `/calendar`, Businesses `/businesses` (+ `[id]`), Users `/users`, Account `/account`.
- `/content/[id]`: the team gets `editor.tsx` (Tiptap, details, links to graphics, status buttons; explicit save, Cmd/Ctrl+S, stale-tab protection via `updated_at`); a client gets `review.tsx` (read-only, select text → Comment, Approve / Ask for changes). An admin can preview the client's view with `?view=client`.
- Comment threads are anchored by quote + context in the plain text (`lib/content/anchor.ts`, `doc-text.ts`), so they survive edits; ported from Meristoll's blog review. Highlights: `lib/content/extensions.ts`, `app/_ui/review/`.
- Statuses (`lib/content/status.ts`, tested): draft (team only) → in_review → approved → published, with changes_requested whenever the client comments or asks for changes. New text on an approved piece sends it back to the client.
- Content templates per format (Hook / Script / Caption / Hashtags, carousel slides...) live in the copy files (`templates`).
- i18n: `lib/i18n/en.ts` defines the shape, `pl.ts` must match (typecheck fails otherwise). Language = `fgc_lang` cookie (set at sign-in from the profile and by the switch), default English. Server: `getI18n()`; client components: `useI18n()`.
- Design: Fast Growth brand tokens in `app/globals.css` (paper ground, ink, one orange accent, Archivo). Never hardcode a hex in a component. Status colours only for status.

## Rules

- Copy: plain and specific, no em dashes, no buzzwords (FG `website-copy` skill). Every string in both languages.
- Never invent client names or numbers in seed data or copy.
- Schema changes: a new file in `supabase/migrations/`, run by hand in the Supabase SQL editor. Keep it `fgc_`-prefixed, RLS on, no policies.
- Before saying something works: `npm run typecheck`, `npm test`, `npm run build`, and look at the pages.

## Commands

```sh
npm run dev
npm run typecheck && npm test && npm run build
npm run admin -- you@example.com [password] [name]   # make an email an FG Content admin
```
