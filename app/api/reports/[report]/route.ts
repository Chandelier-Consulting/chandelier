import { NextResponse } from "next/server";
import { reports } from "@/lib/demo-data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ report: string }> },
) {
  const { report } = await params;
  const fileName = report.endsWith(".csv") ? report : `${report}.csv`;

  if (!reports.includes(fileName)) {
    return NextResponse.json({ error: "Unknown report" }, { status: 404 });
  }

  const csv = [
    "report,generated_at,status",
    `${fileName},${new Date().toISOString()},ready_for_supabase_export`,
  ].join("\n");

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${fileName}"`,
    },
  });
}
