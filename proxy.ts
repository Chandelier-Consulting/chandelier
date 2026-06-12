import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_ACCESS_COOKIE,
  buildAdminRedirectUrl,
  describeAdminAccess,
  getPublicSupabase,
} from "@/lib/admin-auth";
import { adminEmails } from "@/lib/env";

export async function proxy(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname === "/admin/login") {
    return NextResponse.next();
  }

  const allowlist = adminEmails();
  if (allowlist.length === 0) {
    return NextResponse.next();
  }

  const { client } = getPublicSupabase();
  if (!client) {
    const url = new URL(buildAdminRedirectUrl(request, "/admin/login"));
    url.searchParams.set("error", "Supabase auth is not configured.");
    return NextResponse.redirect(url);
  }

  const accessToken = request.cookies.get(ADMIN_ACCESS_COOKIE)?.value;
  const access = await describeAdminAccess(client, accessToken, allowlist);

  if (access.ok) {
    return NextResponse.next();
  }

  const url = new URL(buildAdminRedirectUrl(request, "/admin/login"));
  url.searchParams.set("error", "Admin access requires a Supabase-authenticated allowlisted email.");
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*"],
};
