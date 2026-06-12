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

export function isAdminRequestAllowed(accessToken: string | undefined, allowlist = adminEmails()) {
  return allowlist.length === 0 || Boolean(accessToken);
}

function headerValues(value: string | null) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function originFromHost(host: string, proto: string) {
  const origin = host.startsWith("http://") || host.startsWith("https://") ? host : `${proto}://${host}`;
  return new URL(origin).origin;
}

function isLocalOrigin(origin: string) {
  const { hostname } = new URL(origin);
  return (
    hostname === "localhost" ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname.startsWith("127.")
  );
}

function preferredPublicOrigin(origins: string[]) {
  return origins.find((candidate) => !isLocalOrigin(candidate)) ?? origins[0];
}

function originsFromHeaders(headersList: Headers) {
  const proto = headerValues(headersList.get("x-forwarded-proto"))[0] ?? "https";
  return [
    ...headerValues(headersList.get("origin")).map((origin) => new URL(origin).origin),
    ...headerValues(headersList.get("x-forwarded-host")).map((host) => originFromHost(host, proto)),
    ...headerValues(headersList.get("host")).map((host) => originFromHost(host, proto)),
  ];
}

export function buildAdminRedirectUrl(request: Request, path: string) {
  const requestOrigin = new URL(request.url).origin;
  const origin = preferredPublicOrigin([
    ...originsFromHeaders(request.headers),
    requestOrigin,
    new URL(env.NEXT_PUBLIC_APP_URL).origin,
  ]);
  return new URL(path, origin).toString();
}

export function buildAdminRedirectUrlFromHeaders(headersList: Headers, path: string) {
  const origins = [...originsFromHeaders(headersList), new URL(env.NEXT_PUBLIC_APP_URL).origin];
  const origin = preferredPublicOrigin(origins);
  return new URL(path, origin).toString();
}

export async function requireAdminAccessForRequest(request: Request) {
  const allowlist = adminEmails();
  const cookieHeader = request.headers.get("cookie") ?? "";
  const accessToken = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_ACCESS_COOKIE}=`))
    ?.slice(ADMIN_ACCESS_COOKIE.length + 1);

  if (!isAdminRequestAllowed(accessToken, allowlist)) {
    return { ok: false as const, status: 401, error: "Admin access requires a Supabase-authenticated allowlisted email." };
  }

  if (allowlist.length === 0) {
    return { ok: true as const };
  }

  const { client, missing } = getPublicSupabase();
  if (!client) {
    return { ok: false as const, status: 503, error: "Supabase auth is not configured.", missing };
  }

  const access = await describeAdminAccess(client, accessToken, allowlist);
  if (!access.ok) {
    return { ok: false as const, status: 401, error: "Admin access requires a Supabase-authenticated allowlisted email." };
  }

  return { ok: true as const };
}

export function adminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: env.NEXT_PUBLIC_APP_URL.startsWith("https://"),
    path: "/",
  };
}
