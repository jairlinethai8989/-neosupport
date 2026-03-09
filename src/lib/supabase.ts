import { createClient } from "@supabase/supabase-js";

// ============================================================
// Supabase Admin Client (Server-side only)
// ============================================================
// Uses the SERVICE_ROLE key to bypass Row Level Security (RLS).
// This is necessary for the LINE webhook API route because
// incoming requests from LINE don't have a Supabase user session.
//
// ⚠️ NEVER expose this client or the service role key to the browser!
// ============================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_URL");
}

if (!supabaseServiceRoleKey) {
  throw new Error("Missing environment variable: SUPABASE_SERVICE_ROLE_KEY");
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
