import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ADMIN_ACCESS_COOKIE,
  ADMIN_REFRESH_COOKIE,
  adminCookieOptions,
  buildAdminRedirectUrl,
  describeAdminAccess,
  getPublicSupabase,
} from "@/lib/admin-auth";
import { adminEmails } from "@/lib/env";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/admin";
  const loginUrl = new URL(buildAdminRedirectUrl(request, "/admin/login"));

  if (!code) {
    loginUrl.searchParams.set("error", "Missing Supabase auth code.");
    return NextResponse.redirect(loginUrl);
  }

  const { client, missing } = getPublicSupabase();
  if (!client) {
    loginUrl.searchParams.set("error", `Supabase auth is not configured: ${missing.join(", ")}`);
    return NextResponse.redirect(loginUrl);
  }

  const { data, error } = await client.auth.exchangeCodeForSession(code);
  if (error || !data.session) {
    loginUrl.searchParams.set("error", error?.message ?? "Supabase did not return a session.");
    return NextResponse.redirect(loginUrl);
  }

  const access = await describeAdminAccess(client, data.session.access_token, adminEmails());
  if (!access.ok) {
    loginUrl.searchParams.set("error", "That Supabase account is not allowlisted for admin access.");
    return NextResponse.redirect(loginUrl);
  }

  const cookieStore = await cookies();
  const options = adminCookieOptions();
  cookieStore.set(ADMIN_ACCESS_COOKIE, data.session.access_token, {
    ...options,
    maxAge: data.session.expires_in,
  });
  cookieStore.set(ADMIN_REFRESH_COOKIE, data.session.refresh_token, {
    ...options,
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.redirect(buildAdminRedirectUrl(request, next.startsWith("/") ? next : "/admin"));
}
