import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Supabase's newer "publishable" key, falling back to the legacy anon key.
const publicKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !publicKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/ANON_KEY",
  );
}

// Shared client using the public key (subject to row-level security).
// Import this rather than calling createClient() per file.
export const supabase: SupabaseClient = createClient(url, publicKey);

let admin: SupabaseClient | undefined;

// Server-only client using the service-role key (bypasses RLS) — for the
// Sheets sync and other trusted server code. Never call from client code.
export function supabaseAdmin(): SupabaseClient {
  if (typeof window !== "undefined") {
    throw new Error("supabaseAdmin() must not be used in the browser");
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  admin ??= createClient(url!, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}
