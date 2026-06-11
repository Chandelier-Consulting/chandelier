import type { AdminSection } from "@/lib/types";

export const businessUnits = [
  { name: "Chandelier Consulting", slug: "chandelier-consulting", revenue: 84200 },
  { name: "AI Consulting", slug: "ai-consulting", revenue: 38600 },
  { name: "SaaS Products", slug: "saas-products", revenue: 18400 },
  { name: "Internal Tools", slug: "internal-tools", revenue: 0 },
];

export const adminSections: Array<{ slug: AdminSection; label: string; description: string }> = [
  { slug: "dashboard", label: "Dashboard", description: "Revenue, cash, invoices, and project health." },
  { slug: "business-units", label: "Business Units", description: "Chandelier Consulting, AI Consulting, SaaS Products, and Internal Tools." },
  { slug: "leads", label: "Leads", description: "Kanban-ready lead intake and conversion tracking." },
  { slug: "clients", label: "Clients", description: "Client profiles, notes, and revenue history." },
  { slug: "proposals", label: "Proposals", description: "Scopes, deliverables, pricing, files, and statuses." },
  { slug: "projects", label: "Projects", description: "Delivery checklists and profitability summaries." },
  { slug: "invoices", label: "Invoices", description: "Stripe invoice status, hosted URLs, deposits, retainers, and line items." },
  { slug: "expenses", label: "Expenses", description: "Categorized expenses, receipts, deductible flags, and project linkage." },
  { slug: "contractors", label: "Contractors", description: "Profiles, tax form status, notes, and payout history." },
  { slug: "payouts", label: "Payouts", description: "Tracked contractor payouts without ACH movement." },
  { slug: "reports", label: "Reports", description: "CPA-ready CSV exports and profitability reports." },
  { slug: "settings", label: "Settings", description: "Admin allowlist, storage buckets, and environment health." },
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
  "clients.csv",
  "projects.csv",
  "business_units.csv",
  "cash_ledger.csv",
  "summary.csv",
];
