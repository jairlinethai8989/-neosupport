import { createClient } from "@supabase/supabase-js";

// ============================================================
// Supabase Public Client (Browser-safe)
// ============================================================
// Uses the anon key for operations initiated directly from the 
// user's browser (like Realtime subscriptions).
// ============================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_URL");
}

if (!supabaseAnonKey) {
  throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
