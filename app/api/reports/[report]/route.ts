import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ADMIN_ACCESS_COOKIE,
  describeAdminAccess,
  getPublicSupabase,
} from "@/lib/admin-auth";
import { loadReportRows, reportDefinitions, toCsv } from "@/lib/admin-data";
import { adminEmails } from "@/lib/env";
import { getServiceSupabase } from "@/lib/supabase";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ report: string }> },
) {
  const { report } = await params;
  const fileName = report.endsWith(".csv") ? report : `${report}.csv`;

  if (!reportDefinitions.some((item) => item.fileName === fileName)) {
    return NextResponse.json({ error: "Unknown report" }, { status: 404 });
  }

  const allowlist = adminEmails();
  if (allowlist.length > 0) {
    const { client: authClient, missing: missingAuth } = getPublicSupabase();
    if (!authClient) {
      return NextResponse.json(
        { error: "Supabase auth is not configured", missing: missingAuth },
        { status: 503 },
      );
    }

    const cookieStore = await cookies();
    const access = await describeAdminAccess(
      authClient,
      cookieStore.get(ADMIN_ACCESS_COOKIE)?.value,
      allowlist,
    );

    if (!access.ok) {
      return NextResponse.json(
        { error: "Admin access requires a Supabase-authenticated allowlisted email." },
        { status: 401 },
      );
    }
  }

  const { client, missing } = getServiceSupabase();
  if (!client) {
    return NextResponse.json({ error: "Supabase is not configured", missing }, { status: 503 });
  }

  const rows = await loadReportRows(client, fileName);
  if (!rows) {
    return NextResponse.json({ error: "Unknown report" }, { status: 404 });
  }

  const csv = toCsv(rows);

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${fileName}"`,
    },
  });
}
