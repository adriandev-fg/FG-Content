-- FG Content: scripts for reels, posts and carousels that clients review and approve.
-- Lives in the Meristoll Supabase project, so every table is prefixed fgc_ and nothing here touches
-- Meristoll's tables. Run once in the Supabase SQL editor. Safe to re-run. To drop the whole app:
--   drop table public.fgc_comments, public.fgc_content, public.fgc_profiles, public.fgc_businesses;
--
-- Access model: who may use the app is decided by fgc_profiles, not by Meristoll's app_metadata role,
-- so a Meristoll login without a profile here gets nothing. Row level security is on with no policies:
-- the browser keys (anon, authenticated) can't read or write any of these tables. Every page loads and
-- writes on the server with the secret key, after checking the signed-in user's profile
-- (lib/auth.ts), and a client only ever gets their own business's rows.

-- 1. Businesses (the client accounts).
create table if not exists public.fgc_businesses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(btrim(name)) between 1 and 200),
  -- Where the client keeps brand assets, footage and finished graphics (Google Drive folder, Dropbox...).
  assets_url  text not null default '' check (length(assets_url) <= 1000),
  notes       text not null default '' check (length(notes) <= 4000),
  archived_at timestamptz,
  created_at  timestamptz not null default now()
);

-- 2. Who may sign in, and to what. An admin sees every business; a client sees exactly one.
create table if not exists public.fgc_profiles (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  email       text not null default '',
  name        text not null default '' check (length(name) <= 200),
  role        text not null check (role in ('admin', 'client')),
  business_id uuid references public.fgc_businesses (id) on delete cascade,
  lang        text not null default 'en' check (lang in ('en', 'pl')),
  created_at  timestamptz not null default now(),
  constraint fgc_profiles_client_has_business check (role = 'admin' or business_id is not null)
);

create index if not exists fgc_profiles_business_idx on public.fgc_profiles (business_id);

-- 3. Content: one reel, post, carousel or story. `body` is the editor's document (Tiptap JSON) and
--    `body_text` its plain text, which comment anchors are measured in. updated_at is set by team saves
--    only (no touch trigger on purpose): a save compares it, so a stale tab can't overwrite a newer save.
create table if not exists public.fgc_content (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references public.fgc_businesses (id) on delete cascade,
  title             text not null check (length(btrim(title)) between 1 and 300),
  format            text not null default 'reel' check (format in ('reel', 'post', 'carousel', 'story')),
  platforms         text[] not null default '{}' check (platforms <@ array['instagram', 'tiktok', 'facebook']::text[]),
  body              jsonb not null default '{"type":"doc","content":[]}'::jsonb check (jsonb_typeof(body) = 'object'),
  body_text         text not null default '' check (length(body_text) <= 100000),
  -- Links to graphics, footage or drafts: [{ "label": "...", "url": "https://..." }].
  links             jsonb not null default '[]'::jsonb check (jsonb_typeof(links) = 'array'),
  status            text not null default 'draft' check (status in ('draft', 'in_review', 'changes_requested', 'approved', 'published')),
  publish_on        date,
  publish_time      text check (publish_time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  published_url     text not null default '' check (length(published_url) <= 1000),
  status_changed_at timestamptz not null default now(),
  approved_at       timestamptz,
  approved_by_kind  text check (approved_by_kind in ('client', 'team')),
  approved_by_name  text not null default '' check (length(approved_by_name) <= 200),
  created_by        uuid references auth.users (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists fgc_content_business_status_idx on public.fgc_content (business_id, status);
create index if not exists fgc_content_publish_on_idx on public.fgc_content (publish_on);

-- 4. Comments: a thread (parent_id null) quotes the text it was left on, or has no quote for a note on
--    the whole piece; replies carry no anchor. Anchors are found again by their text after an edit.
create table if not exists public.fgc_comments (
  id          uuid primary key default gen_random_uuid(),
  content_id  uuid not null references public.fgc_content (id) on delete cascade,
  business_id uuid not null references public.fgc_businesses (id) on delete cascade,
  parent_id   uuid references public.fgc_comments (id) on delete cascade,
  author_id   uuid references auth.users (id) on delete set null,
  author_kind text not null check (author_kind in ('client', 'team')),
  author_name text not null default '' check (length(author_name) <= 200),
  body        text not null check (length(btrim(body)) between 1 and 4000),
  quote       text check (length(quote) <= 4000),
  prefix      text check (length(prefix) <= 100),
  suffix      text check (length(suffix) <= 100),
  anchor_from integer,
  anchor_to   integer,
  resolved_at timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists fgc_comments_content_idx on public.fgc_comments (content_id, created_at);

-- 5. Lock the tables to the server. No policies on purpose: only the secret key gets in.
alter table public.fgc_businesses enable row level security;
alter table public.fgc_profiles   enable row level security;
alter table public.fgc_content    enable row level security;
alter table public.fgc_comments   enable row level security;

revoke all on public.fgc_businesses, public.fgc_profiles, public.fgc_content, public.fgc_comments from anon, authenticated;
