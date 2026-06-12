import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY — copy .env.example to .env.local and fill it in."
  );
}

// createBrowserClient is a singleton internally, so calling this repeatedly
// returns the same instance. The session lives in cookies (sb-<ref>-auth-token)
// rather than localStorage, so the server/proxy can read and refresh it.
export function createClient() {
  return createBrowserClient(url!, key!);
}

// Convenience singleton for the many client components that import `supabase`.
export const supabase = createClient();

export const SUPABASE_URL = url;
