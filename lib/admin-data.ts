import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdminSection } from "@/lib/types";

export const crmStatuses = ["lead", "contacted", "proposal", "active", "completed", "paid", "lost"];

export const adminSections: Array<{ slug: AdminSection; label: string; description: string }> = [
  { slug: "dashboard", label: "Dashboard", description: "Stats, pipeline, invoices, payouts, and reimbursements." },
  { slug: "crm", label: "CRM", description: "Businesses from first lead through completed and paid work." },
  { slug: "finances", label: "Finances", description: "Invoice creation, open money, payouts, and reimbursements." },
  { slug: "settings", label: "Settings", description: "Admin access, Supabase, and Stripe health." },
];

export const reportDefinitions = [
  { fileName: "businesses.csv", table: "businesses" },
  { fileName: "invoices.csv", table: "invoices" },
  { fileName: "invoice_line_items.csv", table: "invoice_line_items" },
  { fileName: "payments.csv", table: "payments" },
  { fileName: "expenses.csv", table: "expenses" },
  { fileName: "contractor_payouts.csv", table: "contractor_payouts" },
  { fileName: "contractors.csv", table: "contractors" },
  { fileName: "cash_ledger.csv", table: "cash_ledger_entries" },
  { fileName: "subscription_schedules.csv", table: "subscription_schedules" },
  { fileName: "summary.csv", table: "summary" },
] as const;

type AnyRow = Record<string, unknown>;

type DashboardSource = {
  businessUnits: Array<{ id?: string; name: string; slug: string; revenueCents: number }>;
  businesses: AnyRow[];
  invoices: Array<{ status?: unknown; total_cents?: unknown; created_at?: unknown }>;
  expenses: Array<{ amount_cents?: unknown; category?: unknown; reimbursable?: unknown; created_at?: unknown }>;
  payouts: Array<{ amount_cents?: unknown; status?: unknown; created_at?: unknown }>;
  payments: Array<{ amount_cents?: unknown; stripe_fee_cents?: unknown; paid_at?: unknown }>;
};

export type AdminRow = {
  id?: string;
  title: string;
  meta: string[];
  amount?: string;
  href?: string;
  fields?: Array<{ label: string; value: string }>;
};

export type AdminField = {
  name: string;
  label: string;
  type: "text" | "email" | "url" | "tel" | "textarea" | "number" | "date" | "select" | "checkbox" | "multitext" | "file";
  required?: boolean;
  options?: string[];
  relation?: "businessUnits" | "businesses" | "contractors";
  bucket?: "receipts" | "contractor-invoices" | "payment-receipts" | "client-assets";
  placeholder?: string;
};

export type AdminFormDefinition = {
  table: string;
  title: string;
  submitLabel: string;
  redirectSection: AdminSection;
  fields: AdminField[];
};

const expenseCategories = [
  "software",
  "hosting",
  "domains",
  "ai_credits",
  "contractor",
  "marketing",
  "legal",
  "accounting",
  "office",
  "equipment",
  "travel",
  "meals",
  "other",
];

export const adminFormDefinitions: Partial<Record<AdminSection, AdminFormDefinition>> = {
  crm: {
    table: "businesses",
    title: "Business",
    submitLabel: "Save business",
    redirectSection: "crm",
    fields: [
      { name: "business_unit_id", label: "Business unit", type: "select", relation: "businessUnits" },
      { name: "name", label: "Business name", type: "text", required: true },
      { name: "contact_name", label: "Contact name", type: "text" },
      { name: "email", label: "Email", type: "email" },
      { name: "phone", label: "Phone", type: "tel", required: true },
      { name: "website_url", label: "Website", type: "url" },
      { name: "category", label: "Category", type: "text" },
      { name: "lead_status", label: "Status", type: "select", options: crmStatuses, required: true },
      {
        name: "requested_services",
        label: "Requested services",
        type: "multitext",
        placeholder: "Website Development, AI Automations",
      },
      { name: "project_summary", label: "Project summary", type: "textarea" },
      { name: "estimated_value_cents", label: "Estimated value", type: "number" },
      { name: "next_action", label: "Next action", type: "text" },
      { name: "next_follow_up_at", label: "Next follow-up", type: "date" },
      { name: "stripe_customer_id", label: "Stripe customer ID", type: "text" },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
  },
  expenses: {
    table: "expenses",
    title: "Expense",
    submitLabel: "Save expense",
    redirectSection: "finances",
    fields: [
      { name: "business_unit_id", label: "Business unit", type: "select", relation: "businessUnits" },
      { name: "business_id", label: "Business", type: "select", relation: "businesses" },
      { name: "category", label: "Category", type: "select", options: expenseCategories, required: true },
      { name: "amount_cents", label: "Amount", type: "number", required: true },
      { name: "receipt_path", label: "Receipt", type: "file", bucket: "receipts" },
      { name: "tax_deductible", label: "Tax deductible", type: "checkbox" },
      { name: "reimbursable", label: "Reimburse me", type: "checkbox" },
      { name: "business_purpose", label: "Business purpose", type: "textarea", required: true },
      { name: "spent_at", label: "Spent at", type: "date", required: true },
    ],
  },
  contractors: {
    table: "contractors",
    title: "Contractor",
    submitLabel: "Save contractor",
    redirectSection: "finances",
    fields: [
      { name: "business_unit_id", label: "Business unit", type: "select", relation: "businessUnits" },
      { name: "name", label: "Name", type: "text", required: true },
      { name: "email", label: "Email", type: "email" },
      {
        name: "tax_form_status",
        label: "Tax form status",
        type: "select",
        options: ["not_requested", "requested", "received", "not_required"],
      },
      { name: "payment_method_notes", label: "Payment method notes", type: "textarea" },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
  },
  payouts: {
    table: "contractor_payouts",
    title: "Contractor payout",
    submitLabel: "Save payout",
    redirectSection: "finances",
    fields: [
      { name: "contractor_id", label: "Contractor", type: "select", relation: "contractors", required: true },
      { name: "business_id", label: "Business", type: "select", relation: "businesses" },
      { name: "amount_cents", label: "Amount", type: "number", required: true },
      { name: "receipt_path", label: "Contractor invoice", type: "file", bucket: "contractor-invoices" },
      { name: "status", label: "Status", type: "select", options: ["tracked", "approved", "paid", "void"] },
      { name: "paid_at", label: "Paid at", type: "date" },
    ],
  },
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
  const reimbursableOpen = source.expenses
    .filter((expense) => Boolean(expense.reimbursable))
    .reduce((sum, expense) => sum + cents(expense.amount_cents), 0);
  const payoutsOpen = source.payouts
    .filter((payout) => !["paid", "void"].includes(String(payout.status ?? "")))
    .reduce((sum, payout) => sum + cents(payout.amount_cents), 0);
  const payoutsYtd = source.payouts
    .filter((payout) => yearMatches(payout.created_at))
    .reduce((sum, payout) => sum + cents(payout.amount_cents), 0);
  const stripeFeesYtd = source.payments
    .filter((payment) => yearMatches(payment.paid_at))
    .reduce((sum, payment) => sum + cents(payment.stripe_fee_cents), 0);

  return {
    metrics: [
      { label: "Revenue this month", value: currency(revenueThisMonth) },
      { label: "Revenue YTD", value: currency(revenueYtd) },
      { label: "Open invoices", value: currency(outstanding) },
      { label: "Contractors owed", value: currency(payoutsOpen) },
      { label: "Reimburse me", value: currency(reimbursableOpen) },
      { label: "Expenses YTD", value: currency(expensesYtd) },
      { label: "Stripe fees YTD", value: currency(stripeFeesYtd) },
      { label: "Cash retained estimate", value: currency(revenueYtd - expensesYtd - payoutsYtd - stripeFeesYtd) },
    ],
    pipeline: crmStatuses.map((stage) => ({
      stage,
      count: source.businesses.filter((business) => String(business.lead_status ?? "lead").toLowerCase() === stage).length,
      valueCents: source.businesses
        .filter((business) => String(business.lead_status ?? "lead").toLowerCase() === stage)
        .reduce((sum, business) => sum + cents(business.estimated_value_cents), 0),
    })),
    businessUnits: source.businessUnits,
  };
}

function text(row: AnyRow, key: string, fallback = "Not set") {
  const value = row[key];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "Not set";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  return value;
}

function detailFields(section: AdminSection, row: AnyRow) {
  const definition = adminFormDefinitions[section];
  if (!definition) return [];
  return definition.fields
    .filter((field) => field.type !== "file")
    .map((field) => {
      const value = field.name.endsWith("_cents")
        ? currency(cents(row[field.name]))
        : displayValue(row[field.name]);
      return { label: field.label, value: String(value) };
    });
}

export function buildSectionRows(section: AdminSection, rows: AnyRow[]): AdminRow[] {
  return rows.map((row) => {
    if (section === "crm") {
      return {
        id: text(row, "id", ""),
        title: text(row, "name", "Unnamed business"),
        meta: [
          text(row, "lead_status", "lead"),
          text(row, "contact_name", "No contact"),
          text(row, "email", text(row, "phone", "No contact info")),
          text(row, "next_action", "No next action"),
        ],
        amount: currency(cents(row.estimated_value_cents)),
        fields: detailFields(section, row),
      };
    }

    if (section === "expenses") {
      return {
        id: text(row, "id", ""),
        title: text(row, "business_purpose"),
        meta: [text(row, "category"), text(row, "spent_at"), Boolean(row.reimbursable) ? "Reimburse me" : "Company expense"],
        amount: currency(cents(row.amount_cents)),
        fields: detailFields(section, row),
      };
    }

    if (section === "contractors") {
      return {
        id: text(row, "id", ""),
        title: text(row, "name"),
        meta: [text(row, "email"), text(row, "tax_form_status")],
        fields: detailFields(section, row),
      };
    }

    if (section === "payouts") {
      return {
        id: text(row, "id", ""),
        title: text(row, "contractor_name", text(row, "status")),
        meta: [text(row, "status"), text(row, "paid_at", "Not paid"), text(row, "business_name", "No business linked")],
        amount: currency(cents(row.amount_cents)),
        fields: detailFields(section, row),
      };
    }

    return {
      id: text(row, "id", ""),
      title: text(row, "id"),
      meta: Object.entries(row)
        .filter(([key]) => key !== "id")
        .slice(0, 3)
        .map(([key, value]) => `${key}: ${String(value ?? "Not set")}`),
    };
  });
}

export function buildMutationPayload(section: AdminSection, values: Map<string, FormDataEntryValue | FormDataEntryValue[]>) {
  const definition = adminFormDefinitions[section];
  if (!definition) {
    throw new Error(`Section ${section} does not support mutations.`);
  }

  const payload: Record<string, unknown> = {};
  for (const field of definition.fields) {
    const raw = values.get(field.name);
    const first = Array.isArray(raw) ? raw[0] : raw;
    const stringValue = String(first ?? "").trim();

    if (field.type === "checkbox") {
      payload[field.name] = stringValue === "on" || stringValue === "true";
      continue;
    }

    if (field.type === "file") {
      continue;
    }

    if (!stringValue && !field.required) {
      payload[field.name] = field.type === "number" || field.name.endsWith("_cents") ? 0 : null;
      continue;
    }

    if (field.type === "number" || field.name.endsWith("_cents")) {
      const number = Number(stringValue.replace(/[$,]/g, ""));
      payload[field.name] = Number.isFinite(number) ? Math.round(number * 100) : 0;
      continue;
    }

    if (field.type === "multitext") {
      payload[field.name] = stringValue
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean);
      continue;
    }

    payload[field.name] = stringValue;
  }

  if (section === "crm" && !payload.lead_status) {
    payload.lead_status = "lead";
  }

  return payload as Record<string, string | number | boolean | string[] | null>;
}

async function list(client: SupabaseClient, table: string) {
  const { data, error } = await client.from(table).select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as AnyRow[];
}

export async function loadAdminDashboard(client: SupabaseClient) {
  const [businessUnits, businesses, invoices, expenses, payouts, payments] = await Promise.all([
    list(client, "business_units"),
    list(client, "businesses"),
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
    businesses,
    invoices,
    expenses,
    payouts,
    payments,
  });
}

export async function loadAdminRows(client: SupabaseClient, section: AdminSection) {
  if (section === "crm") {
    return buildSectionRows(section, await list(client, "businesses"));
  }

  if (section === "expenses" || section === "contractors" || section === "payouts") {
    return buildSectionRows(section, await loadAdminRecords(client, section));
  }

  return [];
}

export async function loadAdminRecords(client: SupabaseClient, section: AdminSection) {
  const definition = adminFormDefinitions[section];
  if (!definition) return [];

  if (section === "payouts") {
    const [payouts, contractors, businesses] = await Promise.all([
      list(client, "contractor_payouts"),
      list(client, "contractors"),
      list(client, "businesses"),
    ]);
    return payouts.map((payout) => ({
      ...payout,
      contractor_name: contractors.find((contractor) => contractor.id === payout.contractor_id)?.name,
      business_name: businesses.find((business) => business.id === payout.business_id)?.name,
    }));
  }

  return list(client, definition.table);
}

export async function loadFinanceData(client: SupabaseClient) {
  const [invoices, payments, expenses, payouts, contractors, businesses] = await Promise.all([
    list(client, "invoices"),
    list(client, "payments"),
    list(client, "expenses"),
    list(client, "contractor_payouts"),
    list(client, "contractors"),
    list(client, "businesses"),
  ]);

  const openInvoices = invoices.filter((invoice) => !["paid", "void", "voided", "uncollectible"].includes(String(invoice.status ?? "")));
  const openPayouts = payouts.filter((payout) => !["paid", "void"].includes(String(payout.status ?? "")));
  const reimbursables = expenses.filter((expense) => Boolean(expense.reimbursable));

  return {
    businesses,
    invoices,
    payments,
    expenses,
    payouts,
    contractors,
    summary: {
      openInvoiceCents: openInvoices.reduce((sum, invoice) => sum + cents(invoice.total_cents), 0),
      contractorOwedCents: openPayouts.reduce((sum, payout) => sum + cents(payout.amount_cents), 0),
      reimbursableCents: reimbursables.reduce((sum, expense) => sum + cents(expense.amount_cents), 0),
      paidCents: payments.filter((payment) => String(payment.status ?? "").includes("paid") || String(payment.status ?? "") === "succeeded")
        .reduce((sum, payment) => sum + cents(payment.amount_cents), 0),
    },
  };
}

export async function loadAdminOptions(client: SupabaseClient) {
  const [businessUnits, businesses, contractors] = await Promise.all([
    list(client, "business_units"),
    list(client, "businesses"),
    list(client, "contractors"),
  ]);

  return {
    businessUnits: businessUnits.map((row) => ({ value: String(row.id), label: text(row, "name") })),
    businesses: businesses.map((row) => ({ value: String(row.id), label: text(row, "name", "Unnamed business") })),
    contractors: contractors.map((row) => ({ value: String(row.id), label: text(row, "name") })),
  };
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

export { currency as formatAdminCurrency };
