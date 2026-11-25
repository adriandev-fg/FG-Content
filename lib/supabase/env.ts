/**
 * Supabase settings. The publishable key is safe in the browser; the secret key bypasses row level
 * security and must stay on the server.
 */
export const supabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL || undefined;
export const publishableKey = () => process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || undefined;
export const secretKey = () => process.env.SUPABASE_SECRET_KEY || undefined;
