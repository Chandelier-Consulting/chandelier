import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildAdminRedirectUrl,
  buildAdminRedirectUrlFromHeaders,
  describeAdminAccess,
  isAdminRequestAllowed,
} from "@/lib/admin-auth";
import {
  adminFormDefinitions,
  buildDashboardSummary,
  buildMutationPayload,
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

function expectsAdminFormDefinitions() {
  adminFormDefinitions.leads?.fields[0] satisfies { name: string; label: string } | undefined;
  adminFormDefinitions.expenses?.fields.find((field) => field.name === "tax_deductible")?.type satisfies
    | string
    | undefined;
  adminFormDefinitions.payouts?.table satisfies string | undefined;
}

function expectsMutationPayloadContract() {
  const payload = buildMutationPayload("expenses", new Map<string, FormDataEntryValue | FormDataEntryValue[]>([
    ["business_purpose", "Production hosting"],
    ["category", "hosting"],
    ["amount_cents", "129.50"],
    ["tax_deductible", "on"],
    ["reimbursable", ""],
    ["spent_at", "2026-06-11"],
  ]));

  payload.amount_cents satisfies unknown;
  payload.tax_deductible satisfies unknown;
  payload.reimbursable satisfies unknown;
}

function expectsAdminUrlAndApiAuthContracts() {
  const redirectUrl = buildAdminRedirectUrl(
    new Request("https://preview.chandelierconsulting.dev/admin/login"),
    "/api/auth/callback?next=/admin",
  );
  if (redirectUrl !== "https://preview.chandelierconsulting.dev/api/auth/callback?next=/admin") {
    throw new Error("admin redirect URL should use the incoming request origin");
  }

  const proxiedRequestRedirectUrl = buildAdminRedirectUrl(
    new Request("http://localhost:3000/api/auth/callback?next=/admin", {
      headers: {
        host: "preview.chandelierconsulting.dev",
        "x-forwarded-host": "localhost:3000",
        "x-forwarded-proto": "https",
      },
    }),
    "/admin",
  );
  if (proxiedRequestRedirectUrl !== "https://preview.chandelierconsulting.dev/admin") {
    throw new Error("admin redirect URL should recover the public host when request.url is local");
  }

  const forwardedRedirectUrl = buildAdminRedirectUrlFromHeaders(
    new Headers({
      host: "preview.chandelierconsulting.dev",
      "x-forwarded-host": "localhost:3000",
      "x-forwarded-proto": "https",
    }),
    "/api/auth/callback?next=/admin",
  );
  if (forwardedRedirectUrl !== "https://preview.chandelierconsulting.dev/api/auth/callback?next=/admin") {
    throw new Error("admin redirect URL should prefer a public origin over an internal localhost origin");
  }

  const allowedWithoutAllowlist = isAdminRequestAllowed(undefined, []);
  const deniedWithAllowlist = isAdminRequestAllowed(undefined, ["owner@example.com"]);

  allowedWithoutAllowlist satisfies boolean;
  deniedWithAllowlist satisfies boolean;
}

void expectsAdminAccessContract;
void expectsSupabaseDashboardContract;
void expectsSectionRowsContract;
void expectsCsvContract;
void expectsAdminFormDefinitions;
void expectsMutationPayloadContract;
expectsAdminUrlAndApiAuthContracts();
