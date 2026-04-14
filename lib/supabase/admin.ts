import { createClient } from "@supabase/supabase-js"

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // ✅ service role key (NOT anon)
  {
    auth: { persistSession: false, autoRefreshToken: false },
  }
)
console.log("ADMIN ENV CHECK", {
  hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  keyPrefix: (process.env.SUPABASE_SERVICE_ROLE_KEY || "").slice(0, 6),
})
