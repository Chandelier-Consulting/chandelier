import type { SupabaseClient } from "@supabase/supabase-js";
import { describeAdminAccess } from "@/lib/admin-auth";
import {
  buildDashboardSummary,
  buildSectionRows,
  reportDefinitions,
  toCsv,
} from "@/lib/admin-data";

const fakeClient = {} as SupabaseClient;

async function expectsAdminAccessContract() {
  const allowed = await describeAdminAccess(fakeClient, "token", ["owner@example.com"]);
  const denied = await describeAdminAccess(fakeClient, "token", ["ops@example.com"]);

  allowed satisfies { ok: boolean; email: string | null };
  denied satisfies { ok: boolean; reason?: string };
}

function expectsSupabaseDashboardContract() {
  const summary = buildDashboardSummary({
    businessUnits: [{ id: "1", name: "AI Consulting", slug: "ai", revenueCents: 125000 }],
    leads: [{ status: "new", project_description: "Test", created_at: "2026-06-11" }],
    invoices: [{ status: "open", total_cents: 50000, created_at: "2026-06-11" }],
    expenses: [{ amount_cents: 10000, category: "software", created_at: "2026-06-11" }],
    payouts: [{ amount_cents: 25000, status: "tracked", created_at: "2026-06-11" }],
    payments: [{ amount_cents: 50000, stripe_fee_cents: 1500, paid_at: "2026-06-11" }],
  });

  summary.metrics[0] satisfies { label: string; value: string };
  summary.pipeline[0] satisfies { stage: string; count: number; valueCents: number };
  summary.businessUnits[0].revenueCents satisfies number;
}

function expectsSectionRowsContract() {
  const rows = buildSectionRows("clients", [
    { name: "Rivera Bakery", contact_name: "Jordan", email: "jordan@example.com" },
  ]);

  rows[0] satisfies { title: string; meta: string[]; href?: string };
}

function expectsCsvContract() {
  const report = reportDefinitions.find((item) => item.fileName === "clients.csv");
  if (!report) throw new Error("clients report is missing");

  const csv = toCsv([
    { name: "Rivera, Bakery", email: "jordan@example.com" },
    { name: "Quote Test", email: '"quoted"@example.com' },
  ]);

  csv.includes('"Rivera, Bakery"') satisfies boolean;
}

void expectsAdminAccessContract;
void expectsSupabaseDashboardContract;
void expectsSectionRowsContract;
void expectsCsvContract;
