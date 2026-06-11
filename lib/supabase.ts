import { createClient } from "@supabase/supabase-js";
import { env, missingEnv } from "@/lib/env";

export function getServiceSupabase() {
  const missing = missingEnv([
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SECRET_KEY",
  ]);

  if (missing.length > 0) {
    return { client: null, missing };
  }

  return {
    client: createClient(
      env.NEXT_PUBLIC_SUPABASE_URL!,
      env.SUPABASE_SECRET_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    ),
    missing: [],
  };
}
