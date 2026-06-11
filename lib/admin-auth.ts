import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import { adminEmails, env, missingEnv } from "@/lib/env";

export const ADMIN_ACCESS_COOKIE = "chandelier_admin_access_token";
export const ADMIN_REFRESH_COOKIE = "chandelier_admin_refresh_token";

type AdminAccess =
  | { ok: true; email: string | null; user: User | null }
  | { ok: false; email: string | null; reason: string };

export function getPublicSupabase() {
  const missing = missingEnv([
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  ]);

  if (missing.length > 0) {
    return { client: null, missing };
  }

  return {
    client: createClient(
      env.NEXT_PUBLIC_SUPABASE_URL!,
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
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

export async function describeAdminAccess(
  client: SupabaseClient,
  accessToken: string | undefined,
  allowlist = adminEmails(),
): Promise<AdminAccess> {
  if (allowlist.length === 0) {
    return { ok: true, email: null, user: null };
  }

  if (!accessToken) {
    return { ok: false, email: null, reason: "missing_session" };
  }

  const { data, error } = await client.auth.getUser(accessToken);
  const email = data.user?.email?.toLowerCase() ?? null;

  if (error || !email) {
    return { ok: false, email, reason: "invalid_session" };
  }

  if (!allowlist.includes(email)) {
    return { ok: false, email, reason: "email_not_allowlisted" };
  }

  return { ok: true, email, user: data.user };
}

export function adminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: env.NEXT_PUBLIC_APP_URL.startsWith("https://"),
    path: "/",
  };
}
