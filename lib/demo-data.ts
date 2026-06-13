import type { AdminSection } from "@/lib/types";

export const businessUnits = [
  { name: "Chandelier Consulting", slug: "chandelier-consulting", revenue: 84200 },
  { name: "AI Consulting", slug: "ai-consulting", revenue: 38600 },
  { name: "SaaS Products", slug: "saas-products", revenue: 18400 },
  { name: "Internal Tools", slug: "internal-tools", revenue: 0 },
];

export const adminSections: Array<{ slug: AdminSection; label: string; description: string }> = [
  { slug: "dashboard", label: "Dashboard", description: "Stats, pipeline, invoices, payouts, and reimbursements." },
  { slug: "crm", label: "CRM", description: "Businesses from first lead through completed and paid work." },
  { slug: "finances", label: "Finances", description: "Invoice creation, open money, payouts, and reimbursements." },
  { slug: "settings", label: "Settings", description: "Admin access, Supabase, and Stripe health." },
];

export const pipeline = [
  { stage: "New", count: 8, value: 42000 },
  { stage: "Proposal", count: 4, value: 31500 },
  { stage: "Won", count: 3, value: 56000 },
  { stage: "Invoiced", count: 5, value: 74800 },
];

export const dashboardMetrics = [
  ["Revenue this month", "$18.4k"],
  ["Revenue YTD", "$141.2k"],
  ["Outstanding invoices", "$26.7k"],
  ["Overdue invoices", "$4.1k"],
  ["Expenses YTD", "$31.8k"],
  ["Contractor payouts YTD", "$44.5k"],
  ["Stripe fees", "$2.9k"],
  ["Cash retained estimate", "$62.0k"],
];

export const reports = [
  "invoices.csv",
  "invoice_line_items.csv",
  "payments.csv",
  "expenses.csv",
  "contractor_payouts.csv",
  "contractors.csv",
  "businesses.csv",
  "cash_ledger.csv",
  "summary.csv",
];
