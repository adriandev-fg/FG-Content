/**
 * Demo data for clicking around: two made-up businesses (names end in "(demo)"), one client login each,
 * content in every status, format and platform around today's date, and comments (open, replied,
 * resolved). Safe to re-run: it deletes the demo businesses first (content, comments and profiles go
 * with them) and keeps the logins, resetting their passwords.
 *   npm run seed:demo
 * Remove everything: npm run seed:demo -- --remove
 */
import { createClient } from "@supabase/supabase-js";
import { buildAnchor } from "../lib/content/anchor";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env");
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const DEMO_SUFFIX = "(demo)";
const PASSWORD = "abcd1234";

// ---------------------------------------------------------------- helpers

type Block = [kind: "h" | "p" | "li", text: string];

/** A Tiptap document and its plain text, the way lib/content/doc-text.ts measures it (blocks joined by \n). */
function doc(blocks: Block[]) {
  const content: unknown[] = [];
  let list: { type: string; content: unknown[] } | null = null;
  for (const [kind, text] of blocks) {
    const inline = text ? [{ type: "text", text }] : [];
    if (kind === "li") {
      if (!list) content.push((list = { type: "bulletList", content: [] }));
      list.content.push({ type: "listItem", content: [{ type: "paragraph", content: inline }] });
      continue;
    }
    list = null;
    content.push(kind === "h" ? { type: "heading", attrs: { level: 3 }, content: inline } : { type: "paragraph", content: inline });
  }
  return { body: { type: "doc", content }, body_text: blocks.map(([, text]) => text).join("\n") };
}

function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw" }).format(new Date());
}
function day(offset: number): string {
  const d = new Date(`${today()}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}
const ago = (hours: number) => new Date(Date.now() - hours * 3600_000).toISOString();

async function findUserId(email: string): Promise<string | null> {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit.id;
    if (data.users.length < 1000) return null;
  }
  return null;
}

async function login(email: string): Promise<string> {
  const existing = await findUserId(email);
  if (existing) {
    await db.auth.admin.updateUserById(existing, { password: PASSWORD });
    return existing;
  }
  const { data, error } = await db.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (error || !data.user) throw error ?? new Error(`createUser ${email}`);
  return data.user.id;
}

// ---------------------------------------------------------------- start clean

const { data: old } = await db.from("fgc_businesses").select("id, name").like("name", `%${DEMO_SUFFIX}`);
if (old?.length) {
  await db.from("fgc_businesses").delete().in("id", old.map((b) => b.id));
  console.log(`Removed ${old.length} old demo businesses (and their content, comments and logins' access).`);
}
if (process.argv.includes("--remove")) process.exit(0);

const { data: admin } = await db.from("fgc_profiles").select("user_id, name, email").eq("role", "admin").order("created_at").limit(1).maybeSingle();
const team = { id: admin?.user_id ?? null, name: admin?.name || "Fast Growth" };

// ---------------------------------------------------------------- businesses and logins

type Seed = {
  business: { name: string; assets_url: string; notes: string };
  login: { email: string; name: string; lang: "en" | "pl" };
  items: Item[];
};

type Item = {
  title: string;
  format: "reel" | "post" | "carousel" | "story";
  platforms: ("instagram" | "tiktok" | "facebook")[];
  status: "draft" | "in_review" | "changes_requested" | "approved" | "published";
  date: number | null;
  time?: string;
  blocks: Block[];
  links?: { label: string; url: string }[];
  publishedUrl?: string;
  approvedBy?: "client" | "team";
  /** Comments: `quote` must appear in the text. `replies` from the team; `resolved` closes the thread. */
  comments?: { quote?: string; body: string; hoursAgo: number; replies?: string[]; resolved?: boolean }[];
};

const bakery: Seed = {
  business: {
    name: `Piekarnia Złoty Kłos ${DEMO_SUFFIX}`,
    assets_url: "https://drive.google.com/drive/folders/demo-piekarnia",
    notes: "Ton: ciepły, lokalny, bez korpomowy. Unikać słowa 'najlepszy'. Oferta: chleb na zakwasie, torty na zamówienie.",
  },
  login: { email: "klient1@test.com", name: "Anna (piekarnia)", lang: "pl" },
  items: [
    {
      title: "Jak powstaje chleb na zakwasie w 30 sekund",
      format: "reel",
      platforms: ["instagram", "tiktok"],
      status: "in_review",
      date: 2,
      time: "18:00",
      blocks: [
        ["h", "Hook (pierwsze 3 sekundy)"],
        ["p", "Ten chleb rośnie 18 godzin, zanim trafi do pieca."],
        ["h", "Scenariusz"],
        ["p", "Ujęcie 1: ręce wyjmują zakwas ze słoika. Lektor: Wszystko zaczyna się od zakwasu, który karmimy codziennie od 2019 roku."],
        ["p", "Ujęcie 2: mieszanie mąki z wodą. Lektor: Tylko mąka, woda i sól. Bez polepszaczy."],
        ["p", "Ujęcie 3: ciasto rośnie w koszyku (timelapse). Lektor: Potem czekamy całą noc."],
        ["p", "Ujęcie 4: chleb wyjeżdża z pieca, chrupiąca skórka. Lektor: A rano jest gotowy na Twój stół."],
        ["h", "Tekst na ekranie"],
        ["p", "18 godzin. 3 składniki. 0 polepszaczy."],
        ["h", "Opis"],
        ["p", "Pytacie, czemu nasz chleb jest tak długo świeży. Odpowiedź: czas. Zamów na jutro rano, link w bio."],
        ["h", "Hashtagi"],
        ["p", "#chlebnazakwasie #piekarnia #rzemieślniczypiekarz #lokalnie"],
      ],
      links: [
        { label: "Surowe nagrania", url: "https://drive.google.com/drive/folders/demo-nagrania-chleb" },
        { label: "Okładka rolki (Canva)", url: "https://www.canva.com/design/demo-okladka" },
      ],
    },
    {
      title: "Karuzela: 5 rzeczy, których nie wiesz o zakwasie",
      format: "carousel",
      platforms: ["instagram", "facebook"],
      status: "changes_requested",
      date: 4,
      time: "12:00",
      blocks: [
        ["h", "Slajd 1 (okładka)"],
        ["p", "5 rzeczy, których nie wiesz o zakwasie"],
        ["h", "Slajd 2"],
        ["p", "Zakwas to żywa kultura bakterii i dzikich drożdży. Nasz ma więcej lat niż niektórzy klienci."],
        ["h", "Slajd 3"],
        ["p", "Chleb na zakwasie dłużej zostaje świeży, bo kwas spowalnia czerstwienie."],
        ["h", "Slajd 4"],
        ["p", "Długa fermentacja sprawia, że chleb jest lżejszy dla brzucha."],
        ["h", "Ostatni slajd (wezwanie do działania)"],
        ["p", "Spróbuj w sobotę: degustacja od 9:00 do 12:00."],
        ["h", "Opis"],
        ["p", "Zapisz, żeby nie zapomnieć, i oznacz kogoś, kto piecze w domu."],
      ],
      links: [{ label: "Projekt slajdów", url: "https://www.canva.com/design/demo-karuzela-zakwas" }],
      comments: [
        { quote: "Nasz ma więcej lat niż niektórzy klienci.", body: "To brzmi trochę niegrzecznie. Napiszmy po prostu, że karmimy go od 2019 roku.", hoursAgo: 20 },
        { quote: "lżejszy dla brzucha", body: "Czy możemy tak pisać? Nie chcę obietnic zdrowotnych.", hoursAgo: 19, replies: ["Dobra uwaga, zmienimy na 'łatwiejszy do strawienia dla wielu osób' albo usuniemy slajd."] },
        { body: "W tytule jest 5 rzeczy, a slajdów z informacjami są tylko 3. Dodajcie dwie albo zmieńcie tytuł.", hoursAgo: 18 },
      ],
    },
    {
      title: "Tort urodzinowy na zamówienie: kulisy",
      format: "reel",
      platforms: ["instagram", "tiktok", "facebook"],
      status: "approved",
      date: 6,
      time: "19:30",
      approvedBy: "client",
      blocks: [
        ["h", "Hook (pierwsze 3 sekundy)"],
        ["p", "Ten tort powstawał 2 dni. Zobacz dlaczego."],
        ["h", "Scenariusz"],
        ["p", "Pieczenie biszkoptów, przekładanie kremem, dekoracja, reakcja klientki przy odbiorze (za zgodą)."],
        ["h", "Opis"],
        ["p", "Torty na zamówienie przyjmujemy z 5-dniowym wyprzedzeniem. Napisz w wiadomości, jaki masz pomysł."],
        ["h", "Hashtagi"],
        ["p", "#tortnazamowienie #tortyurodzinowe #cukiernia"],
      ],
      links: [{ label: "Nagrania z pracowni", url: "https://drive.google.com/drive/folders/demo-tort" }],
      comments: [{ quote: "Ten tort powstawał 2 dni.", body: "Super, tylko zmieńmy na 'prawie 2 dni', żeby było uczciwie.", hoursAgo: 50, replies: ["Poprawione."], resolved: true }],
    },
    {
      title: "Post: nowe godziny otwarcia w grudniu",
      format: "post",
      platforms: ["facebook", "instagram"],
      status: "published",
      date: -3,
      time: "09:00",
      approvedBy: "client",
      publishedUrl: "https://www.instagram.com/p/demo-godziny",
      blocks: [
        ["h", "Tekst na grafice"],
        ["p", "Od 1 grudnia otwieramy o 6:30"],
        ["h", "Opis"],
        ["p", "Żebyście zdążyli po świeże pieczywo przed pracą. W niedziele bez zmian: 8:00 do 13:00."],
      ],
    },
    {
      title: "Relacja: ankieta, jaki chleb na święta",
      format: "story",
      platforms: ["instagram"],
      status: "draft",
      date: 9,
      blocks: [
        ["h", "Klatka 1"],
        ["p", "Pieczemy specjalny chleb na święta. Pomóż nam wybrać!"],
        ["h", "Klatka 2"],
        ["p", "Ankieta: z żurawiną czy z orzechami?"],
        ["h", "Naklejka lub link"],
        ["p", "Naklejka ankiety + link do zamówień przedświątecznych"],
      ],
    },
    {
      title: "Rolka: dzień z życia piekarza (pomysł)",
      format: "reel",
      platforms: ["tiktok"],
      status: "draft",
      date: null,
      blocks: [
        ["h", "Hook (pierwsze 3 sekundy)"],
        ["p", "Budzik o 3:00. Tak wygląda mój dzień."],
        ["h", "Scenariusz"],
        ["p", "TODO: ustalić z klientem, czy właściciel chce wystąpić przed kamerą."],
      ],
    },
  ],
};

const gym: Seed = {
  business: {
    name: `Peak Form Studio ${DEMO_SUFFIX}`,
    assets_url: "https://drive.google.com/drive/folders/demo-gym",
    notes: "Voice: direct, encouraging, no shaming. Coaches: use first names only. Offer: 2-week intro pass.",
  },
  login: { email: "klient2@test.com", name: "Mark (studio)", lang: "en" },
  items: [
    {
      title: "3 mistakes beginners make with squats",
      format: "reel",
      platforms: ["instagram", "tiktok"],
      status: "in_review",
      date: 1,
      time: "07:00",
      blocks: [
        ["h", "Hook (first 3 seconds)"],
        ["p", "Your knees hurt after squats? It's probably one of these."],
        ["h", "Script"],
        ["p", "Mistake 1: heels lifting off the floor. Fix: push through the whole foot."],
        ["p", "Mistake 2: knees caving in. Fix: think about spreading the floor apart."],
        ["p", "Mistake 3: going too heavy too soon. Fix: own the movement first, then add weight."],
        ["h", "On-screen text"],
        ["li", "Heels down"],
        ["li", "Knees out"],
        ["li", "Earn the weight"],
        ["h", "Caption"],
        ["p", "Save this for leg day. Want a coach to check your form? Our 2-week intro pass includes a technique session."],
        ["h", "Hashtags"],
        ["p", "#squats #strengthtraining #beginnerworkout"],
      ],
      links: [{ label: "Raw footage", url: "https://drive.google.com/drive/folders/demo-squats" }],
      comments: [{ quote: "Your knees hurt after squats?", body: "Love this hook. Can we film it with Kasia instead of Tom?", hoursAgo: 3 }],
    },
    {
      title: "Carousel: what a 2-week intro pass includes",
      format: "carousel",
      platforms: ["instagram", "facebook"],
      status: "in_review",
      date: 3,
      time: "12:30",
      blocks: [
        ["h", "Slide 1 (cover)"],
        ["p", "New here? Start with 2 weeks."],
        ["h", "Slide 2"],
        ["p", "Unlimited classes for 14 days."],
        ["h", "Slide 3"],
        ["p", "One 1:1 technique session with a coach."],
        ["h", "Last slide (call to action)"],
        ["p", "Book your first class with the link in bio."],
        ["h", "Caption"],
        ["p", "No contract, no pressure. Just come and see if it fits."],
      ],
      links: [{ label: "Slides (Canva)", url: "https://www.canva.com/design/demo-intro-pass" }],
    },
    {
      title: "Member story: from 0 to first pull-up",
      format: "reel",
      platforms: ["instagram", "facebook"],
      status: "changes_requested",
      date: 8,
      time: "18:00",
      blocks: [
        ["h", "Hook (first 3 seconds)"],
        ["p", "Six months ago she couldn't hang from the bar."],
        ["h", "Script"],
        ["p", "Short interview with the member, cut with training clips, ending on the first pull-up."],
        ["h", "Caption"],
        ["p", "Proud of you! Every strong person started somewhere."],
      ],
      comments: [
        { quote: "Six months ago she couldn't hang from the bar.", body: "Please check with her first, she may not want this said publicly.", hoursAgo: 26 },
        { body: "Overall good, but let's wait until we have her written consent.", hoursAgo: 25 },
      ],
    },
    {
      title: "Story: this week's class schedule",
      format: "story",
      platforms: ["instagram"],
      status: "approved",
      date: 0,
      time: "08:00",
      approvedBy: "team",
      blocks: [
        ["h", "Frame 1"],
        ["p", "This week at Peak Form"],
        ["h", "Frame 2"],
        ["p", "Mon/Wed/Fri: Strength 7:00 and 18:00. Tue/Thu: Mobility 19:00."],
        ["h", "Sticker or link"],
        ["p", "Link sticker: booking page"],
      ],
    },
    {
      title: "Post: gym closed for maintenance",
      format: "post",
      platforms: ["facebook"],
      status: "published",
      date: -6,
      time: "10:00",
      approvedBy: "client",
      publishedUrl: "https://www.facebook.com/demo/posts/maintenance",
      blocks: [
        ["h", "Graphic text"],
        ["p", "Closed Saturday for new flooring"],
        ["h", "Caption"],
        ["p", "We're putting in new floors this Saturday. See you Sunday on the new surface!"],
      ],
    },
    {
      title: "TikTok trend: coach reacts to gym myths",
      format: "reel",
      platforms: ["tiktok"],
      status: "draft",
      date: 12,
      blocks: [
        ["h", "Hook (first 3 seconds)"],
        ["p", "Myth: lifting weights makes women bulky."],
        ["h", "Script"],
        ["p", "Coach reacts with a duet-style split screen. TODO: pick 3 myths."],
      ],
    },
  ],
};

// ---------------------------------------------------------------- write

for (const seed of [bakery, gym]) {
  const { data: business, error: bErr } = await db.from("fgc_businesses").insert(seed.business).select("id").single();
  if (bErr || !business) throw bErr;

  const userId = await login(seed.login.email);
  await db.from("fgc_profiles").delete().eq("user_id", userId);
  const { error: pErr } = await db.from("fgc_profiles").insert({ user_id: userId, email: seed.login.email, name: seed.login.name, role: "client", business_id: business.id, lang: seed.login.lang });
  if (pErr) throw pErr;

  for (const item of seed.items) {
    const { body, body_text } = doc(item.blocks);
    const approvedAt = item.approvedBy ? ago(30) : null;
    const { data: row, error } = await db
      .from("fgc_content")
      .insert({
        business_id: business.id,
        title: item.title,
        format: item.format,
        platforms: item.platforms,
        body,
        body_text,
        links: item.links ?? [],
        status: item.status,
        publish_on: item.date === null ? null : day(item.date),
        publish_time: item.date === null ? null : (item.time ?? null),
        published_url: item.publishedUrl ?? "",
        status_changed_at: ago(item.status === "draft" ? 72 : 24),
        approved_at: approvedAt,
        approved_by_kind: item.approvedBy ?? null,
        approved_by_name: item.approvedBy === "client" ? seed.login.name : item.approvedBy === "team" ? team.name : "",
        created_by: team.id,
        created_at: ago(96),
        updated_at: ago(48),
      })
      .select("id")
      .single();
    if (error || !row) throw error;

    for (const c of item.comments ?? []) {
      let anchor = null;
      if (c.quote) {
        const at = body_text.indexOf(c.quote);
        if (at < 0) throw new Error(`Quote not in text: ${c.quote}`);
        anchor = buildAnchor(body_text, at, at + c.quote.length);
      }
      const { data: thread, error: cErr } = await db
        .from("fgc_comments")
        .insert({
          content_id: row.id,
          business_id: business.id,
          author_id: userId,
          author_kind: "client",
          author_name: seed.login.name,
          body: c.body,
          quote: anchor?.quote ?? null,
          prefix: anchor?.prefix ?? null,
          suffix: anchor?.suffix ?? null,
          anchor_from: anchor?.from ?? null,
          anchor_to: anchor?.to ?? null,
          resolved_at: c.resolved ? ago(c.hoursAgo - 2) : null,
          created_at: ago(c.hoursAgo),
        })
        .select("id")
        .single();
      if (cErr || !thread) throw cErr;
      for (const [i, reply] of (c.replies ?? []).entries()) {
        await db.from("fgc_comments").insert({
          content_id: row.id,
          business_id: business.id,
          parent_id: thread.id,
          author_id: team.id,
          author_kind: "team",
          author_name: team.name,
          body: reply,
          created_at: ago(c.hoursAgo - 1 - i),
        });
      }
    }
  }
  console.log(`${seed.business.name}: ${seed.items.length} pieces, login ${seed.login.email} / ${PASSWORD} (${seed.login.lang})`);
}
console.log("Done.");
