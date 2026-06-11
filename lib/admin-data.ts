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
  relation?: "businessUnits" | "leads" | "clients" | "projects" | "contractors" | "proposals";
  bucket?: "proposal-pdfs" | "receipts" | "contractor-invoices" | "payment-receipts" | "client-assets";
  placeholder?: string;
};

export type AdminFormDefinition = {
  table: string;
  title: string;
  submitLabel: string;
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
  "business-units": {
    table: "business_units",
    title: "Business unit",
    submitLabel: "Save business unit",
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "slug", label: "Slug", type: "text", required: true },
      { name: "description", label: "Description", type: "textarea" },
    ],
  },
  leads: {
    table: "leads",
    title: "Lead",
    submitLabel: "Save lead",
    fields: [
      { name: "business_unit_id", label: "Business unit", type: "select", relation: "businessUnits" },
      { name: "business_name", label: "Business name", type: "text", required: true },
      { name: "contact_name", label: "Contact name", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "phone", label: "Phone", type: "tel" },
      { name: "website", label: "Website", type: "url" },
      { name: "budget", label: "Budget", type: "text" },
      {
        name: "requested_services",
        label: "Requested services",
        type: "multitext",
        placeholder: "Website Development, AI Automations",
      },
      { name: "project_description", label: "Project description", type: "textarea", required: true },
      { name: "status", label: "Status", type: "select", options: ["new", "proposal", "won", "invoiced", "lost"] },
    ],
  },
  clients: {
    table: "clients",
    title: "Client",
    submitLabel: "Save client",
    fields: [
      { name: "business_unit_id", label: "Business unit", type: "select", relation: "businessUnits" },
      { name: "name", label: "Client name", type: "text", required: true },
      { name: "contact_name", label: "Contact name", type: "text" },
      { name: "email", label: "Email", type: "email" },
      { name: "phone", label: "Phone", type: "tel" },
      { name: "notes", label: "Notes", type: "textarea" },
      { name: "stripe_customer_id", label: "Stripe customer ID", type: "text" },
    ],
  },
  proposals: {
    table: "proposals",
    title: "Proposal",
    submitLabel: "Save proposal",
    fields: [
      { name: "business_unit_id", label: "Business unit", type: "select", relation: "businessUnits" },
      { name: "lead_id", label: "Lead", type: "select", relation: "leads" },
      { name: "client_id", label: "Client", type: "select", relation: "clients" },
      { name: "scope_of_work", label: "Scope of work", type: "textarea", required: true },
      { name: "deliverables", label: "Deliverables", type: "multitext" },
      { name: "pricing_cents", label: "Price", type: "number", required: true },
      { name: "pdf_path", label: "Proposal PDF", type: "file", bucket: "proposal-pdfs" },
      { name: "status", label: "Status", type: "select", options: ["draft", "sent", "accepted", "declined"] },
    ],
  },
  projects: {
    table: "projects",
    title: "Project",
    submitLabel: "Save project",
    fields: [
      { name: "business_unit_id", label: "Business unit", type: "select", relation: "businessUnits" },
      { name: "client_id", label: "Client", type: "select", relation: "clients" },
      { name: "proposal_id", label: "Proposal", type: "select", relation: "proposals" },
      { name: "name", label: "Project name", type: "text", required: true },
      { name: "deliverables", label: "Deliverables", type: "multitext" },
      { name: "status", label: "Status", type: "select", options: ["active", "blocked", "complete", "paused"] },
      { name: "budget_cents", label: "Budget", type: "number", required: true },
      { name: "cost_cents", label: "Cost", type: "number", required: true },
    ],
  },
  expenses: {
    table: "expenses",
    title: "Expense",
    submitLabel: "Save expense",
    fields: [
      { name: "business_unit_id", label: "Business unit", type: "select", relation: "businessUnits" },
      { name: "client_id", label: "Client", type: "select", relation: "clients" },
      { name: "project_id", label: "Project", type: "select", relation: "projects" },
      { name: "category", label: "Category", type: "select", options: expenseCategories, required: true },
      { name: "amount_cents", label: "Amount", type: "number", required: true },
      { name: "receipt_path", label: "Receipt", type: "file", bucket: "receipts" },
      { name: "tax_deductible", label: "Tax deductible", type: "checkbox" },
      { name: "reimbursable", label: "Reimbursable", type: "checkbox" },
      { name: "business_purpose", label: "Business purpose", type: "textarea", required: true },
      { name: "spent_at", label: "Spent at", type: "date", required: true },
    ],
  },
  contractors: {
    table: "contractors",
    title: "Contractor",
    submitLabel: "Save contractor",
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
    title: "Payout",
    submitLabel: "Save payout",
    fields: [
      { name: "contractor_id", label: "Contractor", type: "select", relation: "contractors", required: true },
      { name: "client_id", label: "Client", type: "select", relation: "clients" },
      { name: "project_id", label: "Project", type: "select", relation: "projects" },
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
  return definition.fields.map((field) => {
    const value = field.name.endsWith("_cents")
      ? currency(cents(row[field.name]))
      : displayValue(row[field.name]);
    return { label: field.label, value: String(value) };
  });
}

export function buildSectionRows(section: AdminSection, rows: AnyRow[]): AdminRow[] {
  return rows.map((row) => {
    if (section === "business-units") {
      return {
        id: text(row, "id", ""),
        title: text(row, "name"),
        meta: [text(row, "slug"), text(row, "description", "No description")],
        amount: currency(cents(row.revenueCents)),
        fields: detailFields(section, row),
      };
    }

    if (section === "leads") {
      return {
        id: text(row, "id", ""),
        title: text(row, "business_name"),
        meta: [text(row, "contact_name"), text(row, "email"), text(row, "status")],
        fields: detailFields(section, row),
      };
    }

    if (section === "clients") {
      return {
        id: text(row, "id", ""),
        title: text(row, "name"),
        meta: [text(row, "contact_name"), text(row, "email"), text(row, "phone")],
        amount: currency(cents(row.revenue_cents)),
        fields: detailFields(section, row),
      };
    }

    if (section === "proposals") {
      return {
        id: text(row, "id", ""),
        title: text(row, "scope_of_work"),
        meta: [text(row, "status"), `Deliverables: ${Array.isArray(row.deliverables) ? row.deliverables.length : 0}`],
        amount: currency(cents(row.pricing_cents)),
        fields: detailFields(section, row),
      };
    }

    if (section === "projects") {
      const profit = cents(row.budget_cents) - cents(row.cost_cents);
      return {
        id: text(row, "id", ""),
        title: text(row, "name"),
        meta: [text(row, "status"), `Cost ${currency(cents(row.cost_cents))}`, `Profit ${currency(profit)}`],
        amount: currency(cents(row.budget_cents)),
        fields: detailFields(section, row),
      };
    }

    if (section === "invoices") {
      return {
        id: text(row, "id", ""),
        title: text(row, "stripe_invoice_id", "Local invoice"),
        meta: [text(row, "status"), text(row, "due_date", "No due date")],
        amount: currency(cents(row.total_cents)),
        href: text(row, "hosted_invoice_url", ""),
        fields: detailFields(section, row),
      };
    }

    if (section === "expenses") {
      return {
        id: text(row, "id", ""),
        title: text(row, "business_purpose"),
        meta: [text(row, "category"), text(row, "spent_at")],
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
        title: text(row, "status"),
        meta: [text(row, "paid_at", "Not paid"), text(row, "receipt_path", "No receipt")],
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
      payload[field.name] = null;
      continue;
    }

    if (field.type === "number" || field.name.endsWith("_cents")) {
      const number = Number(stringValue.replace(/[$,]/g, ""));
      payload[field.name] = Number.isFinite(number) ? Math.round(number * 100) : 0;
      continue;
    }

    if (field.type === "multitext") {
      const parts = stringValue
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean);
      payload[field.name] = field.name === "deliverables"
        ? parts.map((title) => ({ title, done: false }))
        : parts;
      continue;
    }

    payload[field.name] = stringValue;
  }

  return payload as Record<string, string | number | boolean | string[] | Array<{ title: string; done: boolean }> | null>;
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

export async function loadAdminRecords(client: SupabaseClient, section: AdminSection) {
  const definition = adminFormDefinitions[section];
  if (!definition) return [];

  if (section === "clients") {
    const rows = await list(client, definition.table);
    const invoices = await list(client, "invoices");
    return rows.map((clientRow) => ({
      ...clientRow,
      revenue_cents: invoices
        .filter((invoice) => invoice.client_id === clientRow.id)
        .reduce((sum, invoice) => sum + cents(invoice.total_cents), 0),
    }));
  }

  return list(client, definition.table);
}

export async function loadAdminOptions(client: SupabaseClient) {
  const [businessUnits, leads, clients, projects, contractors, proposals] = await Promise.all([
    list(client, "business_units"),
    list(client, "leads"),
    list(client, "clients"),
    list(client, "projects"),
    list(client, "contractors"),
    list(client, "proposals"),
  ]);

  return {
    businessUnits: businessUnits.map((row) => ({ value: String(row.id), label: text(row, "name") })),
    leads: leads.map((row) => ({ value: String(row.id), label: text(row, "business_name") })),
    clients: clients.map((row) => ({ value: String(row.id), label: text(row, "name") })),
    projects: projects.map((row) => ({ value: String(row.id), label: text(row, "name") })),
    contractors: contractors.map((row) => ({ value: String(row.id), label: text(row, "name") })),
    proposals: proposals.map((row) => ({ value: String(row.id), label: text(row, "scope_of_work") })),
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
