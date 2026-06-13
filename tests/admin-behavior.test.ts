import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildAdminAppUrl,
  buildAdminRedirectUrl,
  buildAdminRedirectUrlFromHeaders,
  buildAdminSessionCookies,
  ADMIN_ACCESS_COOKIE,
  ADMIN_REFRESH_COOKIE,
  describeAdminAccess,
  isAdminRequestAllowed,
} from "@/lib/admin-auth";
import {
  adminFormDefinitions,
  buildDashboardSummary,
  buildMutationPayload,
  buildSectionRows,
  loadDemoAdminDashboard,
  loadDemoAdminOptions,
  loadDemoAdminRecords,
  loadDemoFinanceData,
  reportDefinitions,
  shouldUseLocalAdminDemo,
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
    businesses: [
      {
        lead_status: "lead",
        project_summary: "Test",
        estimated_value_cents: 125000,
        created_at: "2026-06-11",
      },
      {
        lead_status: "active",
        project_summary: "Build",
        estimated_value_cents: 500000,
        created_at: "2026-06-11",
      },
    ],
    invoices: [{ status: "open", total_cents: 50000, created_at: "2026-06-11" }],
    expenses: [{ amount_cents: 10000, category: "software", created_at: "2026-06-11" }],
    payouts: [{ amount_cents: 25000, status: "tracked", created_at: "2026-06-11" }],
    payments: [{ amount_cents: 50000, stripe_fee_cents: 1500, paid_at: "2026-06-11" }],
  });

  summary.metrics[0] satisfies { label: string; value: string };
  summary.pipeline[0] satisfies { stage: string; count: number; valueCents: number };
  if (summary.pipeline.find((item) => item.stage === "active")?.valueCents !== 500000) {
    throw new Error("Dashboard pipeline should summarize business estimated value by status");
  }
  summary.businessUnits[0].revenueCents satisfies number;
}

function expectsSectionRowsContract() {
  const rows = buildSectionRows("crm", [
    {
      name: "Rivera Bakery",
      contact_name: "Jordan",
      email: "jordan@example.com",
      lead_status: "proposal",
      estimated_value_cents: 750000,
      next_action: "Send deposit invoice",
    },
  ]);

  rows[0] satisfies { title: string; meta: string[]; href?: string };
  if (rows[0]?.amount !== "$7,500") {
    throw new Error("CRM rows should show estimated value from businesses");
  }
}

function expectsCsvContract() {
  const report = reportDefinitions.find((item) => item.fileName === "businesses.csv");
  if (!report) throw new Error("businesses report is missing");

  const csv = toCsv([
    { name: "Rivera, Bakery", email: "jordan@example.com" },
    { name: "Quote Test", email: '"quoted"@example.com' },
  ]);

  csv.includes('"Rivera, Bakery"') satisfies boolean;
}

function expectsAdminFormDefinitions() {
  adminFormDefinitions.crm?.fields[0] satisfies { name: string; label: string } | undefined;
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
  const canonicalEmailRedirectUrl = buildAdminAppUrl("/api/auth/callback?next=/admin");
  if (canonicalEmailRedirectUrl !== "https://chandelierconsulting.dev/api/auth/callback?next=/admin") {
    throw new Error("Supabase callback URL should use NEXT_PUBLIC_APP_URL");
  }

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

function expectsAdminSessionCookieContract() {
  const cookies = buildAdminSessionCookies({
    access_token: "access-token",
    refresh_token: "refresh-token",
    expires_in: 3600,
  });

  if (cookies.length !== 2) {
    throw new Error("admin password sign-in should persist both Supabase session tokens");
  }

  if (cookies[0]?.name !== ADMIN_ACCESS_COOKIE || cookies[0]?.value !== "access-token" || cookies[0]?.maxAge !== 3600) {
    throw new Error("admin access cookie should use Supabase access token expiration");
  }

  if (
    cookies[1]?.name !== ADMIN_REFRESH_COOKIE ||
    cookies[1]?.value !== "refresh-token" ||
    cookies[1]?.maxAge !== 60 * 60 * 24 * 30
  ) {
    throw new Error("admin refresh cookie should be persisted for 30 days");
  }
}

async function expectsLocalAdminDemoContract() {
  if (!shouldUseLocalAdminDemo(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET_KEY"], "development")) {
    throw new Error("local admin demo should be available in development when Supabase service config is missing");
  }

  if (shouldUseLocalAdminDemo(["SUPABASE_SECRET_KEY"], "production")) {
    throw new Error("local admin demo should not bypass missing Supabase service config in production");
  }

  if (!shouldUseLocalAdminDemo(["SUPABASE_SECRET_KEY"], "production", "1")) {
    throw new Error("local admin demo should be available in production builds only when explicitly enabled");
  }

  const dashboard = loadDemoAdminDashboard();
  const finance = loadDemoFinanceData();
  const options = loadDemoAdminOptions();
  const payouts = await loadDemoAdminRecords("payouts");

  if (dashboard.metrics.length === 0 || dashboard.pipeline.length === 0) {
    throw new Error("local admin demo should provide dashboard metrics and pipeline data");
  }

  if (finance.businesses.length === 0 || finance.invoices.length === 0 || finance.summary.openInvoiceCents <= 0) {
    throw new Error("local admin demo should provide finance workspace data");
  }

  if (options.businesses.length === 0 || payouts.length === 0) {
    throw new Error("local admin demo should provide form options and joined payout records");
  }
}

void expectsAdminAccessContract;
void expectsSupabaseDashboardContract;
void expectsSectionRowsContract;
void expectsCsvContract;
void expectsAdminFormDefinitions;
void expectsMutationPayloadContract;
expectsAdminUrlAndApiAuthContracts();
expectsAdminSessionCookieContract();
void expectsLocalAdminDemoContract;
