// Re-export the cookie-based browser client. Client components import the
// `supabase` singleton from here; SSR/route code should import from
// "@/lib/supabase/server" instead.
export { supabase, createClient, SUPABASE_URL } from "./supabase/client";
