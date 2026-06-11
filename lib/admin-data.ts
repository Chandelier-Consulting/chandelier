import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdminSection } from "@/lib/types";

export const adminSections: Array<{ slug: AdminSection; label: string; description: string }> = [
  { slug: "dashboard", label: "Dashboard", description: "Revenue, cash, invoices, and project health." },
  { slug: "business-units", label: "Business Units", description: "Revenue and records by operating unit." },
  { slug: "leads", label: "Leads", description: "Lead intake and conversion tracking." },
  { slug: "clients", label: "Clients", description: "Client profiles, notes, and revenue history." },
  { slug: "proposals", label: "Proposals", description: "Scopes, deliverables, pricing, files, and statuses." },
  { slug: "projects", label: "Projects", description: "Delivery status, budgets, and profitability summaries." },
  { slug: "invoices", label: "Invoices", description: "Stripe invoice status, hosted URLs, deposits, retainers, and line items." },
  { slug: "expenses", label: "Expenses", description: "Categorized expenses, receipts, deductible flags, and project linkage." },
  { slug: "contractors", label: "Contractors", description: "Profiles, tax form status, notes, and payout history." },
  { slug: "payouts", label: "Payouts", description: "Tracked contractor payouts without ACH movement." },
  { slug: "reports", label: "Reports", description: "CPA-ready CSV exports and profitability reports." },
  { slug: "settings", label: "Settings", description: "Admin allowlist, storage buckets, and environment health." },
];

export const reportDefinitions = [
  { fileName: "invoices.csv", table: "invoices" },
  { fileName: "invoice_line_items.csv", table: "invoice_line_items" },
  { fileName: "payments.csv", table: "payments" },
  { fileName: "expenses.csv", table: "expenses" },
  { fileName: "contractor_payouts.csv", table: "contractor_payouts" },
  { fileName: "contractors.csv", table: "contractors" },
  { fileName: "clients.csv", table: "clients" },
  { fileName: "projects.csv", table: "projects" },
  { fileName: "business_units.csv", table: "business_units" },
  { fileName: "cash_ledger.csv", table: "cash_ledger_entries" },
  { fileName: "subscription_schedules.csv", table: "subscription_schedules" },
  { fileName: "summary.csv", table: "summary" },
] as const;

type AnyRow = Record<string, unknown>;

type DashboardSource = {
  businessUnits: Array<{ id?: string; name: string; slug: string; revenueCents: number }>;
  leads: AnyRow[];
  invoices: Array<{ status?: unknown; total_cents?: unknown; created_at?: unknown }>;
  expenses: Array<{ amount_cents?: unknown; category?: unknown; created_at?: unknown }>;
  payouts: Array<{ amount_cents?: unknown; status?: unknown; created_at?: unknown }>;
  payments: Array<{ amount_cents?: unknown; stripe_fee_cents?: unknown; paid_at?: unknown }>;
};

export type AdminRow = {
  title: string;
  meta: string[];
  amount?: string;
  href?: string;
};

function cents(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function currency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value / 100);
}

function monthMatches(value: unknown, now = new Date()) {
  if (typeof value !== "string") return false;
  const date = new Date(value);
  return date.getUTCFullYear() === now.getUTCFullYear() && date.getUTCMonth() === now.getUTCMonth();
}

function yearMatches(value: unknown, now = new Date()) {
  if (typeof value !== "string") return false;
  return new Date(value).getUTCFullYear() === now.getUTCFullYear();
}

export function buildDashboardSummary(source: DashboardSource) {
  const revenueThisMonth = source.payments
    .filter((payment) => monthMatches(payment.paid_at))
    .reduce((sum, payment) => sum + cents(payment.amount_cents), 0);
  const revenueYtd = source.payments
    .filter((payment) => yearMatches(payment.paid_at))
    .reduce((sum, payment) => sum + cents(payment.amount_cents), 0);
  const outstanding = source.invoices
    .filter((invoice) => !["paid", "void", "voided", "uncollectible"].includes(String(invoice.status ?? "")))
    .reduce((sum, invoice) => sum + cents(invoice.total_cents), 0);
  const expensesYtd = source.expenses
    .filter((expense) => yearMatches(expense.created_at))
    .reduce((sum, expense) => sum + cents(expense.amount_cents), 0);
  const payoutsYtd = source.payouts
    .filter((payout) => yearMatches(payout.created_at))
    .reduce((sum, payout) => sum + cents(payout.amount_cents), 0);
  const stripeFeesYtd = source.payments
    .filter((payment) => yearMatches(payment.paid_at))
    .reduce((sum, payment) => sum + cents(payment.stripe_fee_cents), 0);

  const leadStages = ["new", "proposal", "won", "invoiced"];

  return {
    metrics: [
      { label: "Revenue this month", value: currency(revenueThisMonth) },
      { label: "Revenue YTD", value: currency(revenueYtd) },
      { label: "Outstanding invoices", value: currency(outstanding) },
      { label: "Expenses YTD", value: currency(expensesYtd) },
      { label: "Contractor payouts YTD", value: currency(payoutsYtd) },
      { label: "Stripe fees YTD", value: currency(stripeFeesYtd) },
      { label: "Leads", value: String(source.leads.length) },
      { label: "Cash retained estimate", value: currency(revenueYtd - expensesYtd - payoutsYtd - stripeFeesYtd) },
    ],
    pipeline: leadStages.map((stage) => ({
      stage,
      count: source.leads.filter((lead) => String(lead.status ?? "").toLowerCase() === stage).length,
      valueCents: 0,
    })),
    businessUnits: source.businessUnits,
  };
}

function text(row: AnyRow, key: string, fallback = "Not set") {
  const value = row[key];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

export function buildSectionRows(section: AdminSection, rows: AnyRow[]): AdminRow[] {
  return rows.map((row) => {
    if (section === "business-units") {
      return {
        title: text(row, "name"),
        meta: [text(row, "slug"), text(row, "description", "No description")],
        amount: currency(cents(row.revenueCents)),
      };
    }

    if (section === "leads") {
      return {
        title: text(row, "business_name"),
        meta: [text(row, "contact_name"), text(row, "email"), text(row, "status")],
      };
    }

    if (section === "clients") {
      return {
        title: text(row, "name"),
        meta: [text(row, "contact_name"), text(row, "email"), text(row, "phone")],
      };
    }

    if (section === "proposals") {
      return {
        title: text(row, "scope_of_work"),
        meta: [text(row, "status"), `Deliverables: ${Array.isArray(row.deliverables) ? row.deliverables.length : 0}`],
        amount: currency(cents(row.pricing_cents)),
      };
    }

    if (section === "projects") {
      return {
        title: text(row, "name"),
        meta: [text(row, "status"), `Cost ${currency(cents(row.cost_cents))}`],
        amount: currency(cents(row.budget_cents)),
      };
    }

    if (section === "invoices") {
      return {
        title: text(row, "stripe_invoice_id", "Local invoice"),
        meta: [text(row, "status"), text(row, "due_date", "No due date")],
        amount: currency(cents(row.total_cents)),
        href: text(row, "hosted_invoice_url", ""),
      };
    }

    if (section === "expenses") {
      return {
        title: text(row, "business_purpose"),
        meta: [text(row, "category"), text(row, "spent_at")],
        amount: currency(cents(row.amount_cents)),
      };
    }

    if (section === "contractors") {
      return {
        title: text(row, "name"),
        meta: [text(row, "email"), text(row, "tax_form_status")],
      };
    }

    if (section === "payouts") {
      return {
        title: text(row, "status"),
        meta: [text(row, "paid_at", "Not paid"), text(row, "receipt_path", "No receipt")],
        amount: currency(cents(row.amount_cents)),
      };
    }

    return {
      title: text(row, "id"),
      meta: Object.entries(row)
        .filter(([key]) => key !== "id")
        .slice(0, 3)
        .map(([key, value]) => `${key}: ${String(value ?? "Not set")}`),
    };
  });
}

async function list(client: SupabaseClient, table: string) {
  const { data, error } = await client.from(table).select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as AnyRow[];
}

export async function loadAdminDashboard(client: SupabaseClient) {
  const [businessUnits, leads, invoices, expenses, payouts, payments] = await Promise.all([
    list(client, "business_units"),
    list(client, "leads"),
    list(client, "invoices"),
    list(client, "expenses"),
    list(client, "contractor_payouts"),
    list(client, "payments"),
  ]);

  const businessUnitRevenue = new Map<string, number>();
  for (const invoice of invoices) {
    const businessUnitId = typeof invoice.business_unit_id === "string" ? invoice.business_unit_id : null;
    if (businessUnitId) {
      businessUnitRevenue.set(businessUnitId, (businessUnitRevenue.get(businessUnitId) ?? 0) + cents(invoice.total_cents));
    }
  }

  return buildDashboardSummary({
    businessUnits: businessUnits.map((unit) => ({
      id: String(unit.id),
      name: text(unit, "name"),
      slug: text(unit, "slug"),
      revenueCents: businessUnitRevenue.get(String(unit.id)) ?? 0,
    })),
    leads,
    invoices,
    expenses,
    payouts,
    payments,
  });
}

export async function loadAdminRows(client: SupabaseClient, section: AdminSection) {
  if (section === "business-units") {
    const dashboard = await loadAdminDashboard(client);
    return buildSectionRows(section, dashboard.businessUnits);
  }

  const tableBySection: Partial<Record<AdminSection, string>> = {
    leads: "leads",
    clients: "clients",
    proposals: "proposals",
    projects: "projects",
    invoices: "invoices",
    expenses: "expenses",
    contractors: "contractors",
    payouts: "contractor_payouts",
  };

  const table = tableBySection[section];
  return table ? buildSectionRows(section, await list(client, table)) : [];
}

function csvCell(value: unknown) {
  if (value === null || value === undefined) return "";
  const stringValue = typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\n\r]/.test(stringValue) ? `"${stringValue.replaceAll('"', '""')}"` : stringValue;
}

export function toCsv(rows: AnyRow[]) {
  if (rows.length === 0) return "";
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  return [
    headers.map(csvCell).join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")),
  ].join("\n");
}

export async function loadReportRows(client: SupabaseClient, fileName: string) {
  const report = reportDefinitions.find((item) => item.fileName === fileName);
  if (!report) return null;

  if (report.table === "summary") {
    const dashboard = await loadAdminDashboard(client);
    return dashboard.metrics.map((metric) => ({ metric: metric.label, value: metric.value }));
  }

  return list(client, report.table);
}
