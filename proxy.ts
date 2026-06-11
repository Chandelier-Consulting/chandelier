import { NextResponse, type NextRequest } from "next/server";
import { adminEmails } from "@/lib/env";

export function proxy(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const allowlist = adminEmails();
  if (allowlist.length === 0) {
    return NextResponse.next();
  }

  const email = request.cookies.get("admin_email")?.value.toLowerCase();
  if (email && allowlist.includes(email)) {
    return NextResponse.next();
  }

  return NextResponse.json(
    { error: "Admin access requires a Supabase-authenticated allowlisted email." },
    { status: 401 },
  );
}

export const config = {
  matcher: ["/admin/:path*"],
};
