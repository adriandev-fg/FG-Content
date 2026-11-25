/**
 * Gives an email admin access to FG Content: every business, every user.
 *   npm run admin -- you@example.com [password] [name]
 * An email that already has a login on the Supabase project (say, a Meristoll admin) keeps its
 * password; a new one needs a password of at least 8 characters. Uses the secret key from .env.
 */
import { createClient } from "@supabase/supabase-js";

const [email, password, ...nameParts] = process.argv.slice(2);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!email || !url || !key) {
  console.error("Usage: npm run admin -- <email> [password] [name]   (needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env)");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function findUserId(target: string): Promise<string | null> {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === target);
    if (hit) return hit.id;
    if (data.users.length < 1000) return null;
  }
  return null;
}

const target = email.trim().toLowerCase();
let userId = await findUserId(target);
if (userId) {
  console.log(`Found an existing login for ${target}; its password stays as it is.`);
} else {
  if (!password || password.length < 8) {
    console.error("No login exists for this email yet: pass a password of at least 8 characters.");
    process.exit(1);
  }
  const { data, error } = await db.auth.admin.createUser({ email: target, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("createUser returned no user");
  userId = data.user.id;
  console.log(`Created a login for ${target}.`);
}

const { error } = await db.from("fgc_profiles").upsert({ user_id: userId, email: target, name: nameParts.join(" "), role: "admin", business_id: null }, { onConflict: "user_id" });
if (error) {
  console.error(`Could not save the profile: ${error.message}`);
  if (/fgc_profiles/.test(error.message)) console.error("Has supabase/migrations/0001_fg_content.sql been run in the Supabase SQL editor?");
  process.exit(1);
}
console.log(`${target} is now an FG Content admin.`);
