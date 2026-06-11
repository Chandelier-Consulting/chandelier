# Chandelier Consulting OS — Master Specification

## Company Structure

Legal Entity:

* Perceo Inc.
* Delaware C-Corporation
* Created through Stripe Atlas
* Existing Stripe account already configured
* Existing business banking already configured

Brand:

* Chandelier Consulting

Important:

* Chandelier Consulting is the public-facing brand.
* Perceo Inc. is the legal entity.
* All invoices, payments, contracts, Stripe records, and accounting are under Perceo Inc.
* Public website should prominently display Chandelier Consulting.
* Footer and legal notices should state:
  "Chandelier Consulting is operated by Perceo Inc."

## Purpose

Build a production-ready internal operating system for Chandelier Consulting.

The system should manage:

* Leads
* Clients
* Proposals
* Projects
* Stripe invoices
* Expenses
* Contractor payouts
* Accounting records
* Cash tracking
* Reporting
* Document storage

The system should also include a professional public marketing website.

## Technology Stack

Frontend:

* Next.js 15 App Router
* TypeScript
* Tailwind CSS
* shadcn/ui

Backend:

* Supabase Postgres
* Supabase Auth
* Supabase Storage

Payments:

* Stripe Invoicing

Hosting:

* Vercel

Validation:

* Zod

Requirements:

* Do NOT use Prisma.
* Use Supabase directly.
* Generate SQL migrations.
* Use Row Level Security.
* Use typed Supabase clients.

## Business Rules

Revenue Flow:

Client
→ Stripe Invoice
→ Perceo Inc. Stripe Account
→ Perceo Inc. Bank Account

Cash Usage:

Perceo Inc.
→ business expenses
→ contractor payouts

Founder Rules:

* Founder money remains inside Perceo Inc.
* No owner draws.
* Founder withdrawals are not implemented in v1.
* Reimbursements are allowed.

Contractor Rules:

* Contractors are independent contractors.
* Contractors are not employees.
* Contractors are not shareholders.
* Contractor payouts are tracked.
* Actual money movement occurs outside the application.

Accounting Rules:

* Track all revenue.
* Track all expenses.
* Track Stripe fees.
* Track contractor payouts.
* Track reimbursements.
* Generate CPA-ready exports.
* Do not calculate taxes.
* Include disclaimer:
  "This is bookkeeping support, not tax advice. Consult a CPA."

## Public Website

Routes:

/
/services
/pricing
/portfolio
/contact

Branding:

Chandelier Consulting

Headline:

"Websites, automations, and digital systems for growing businesses."

Services:

* Website Development
* Custom Software
* AI Automations
* Internal Dashboards
* Business Systems
* SEO & Local Presence
* Maintenance Retainers

Contact Form Fields:

* Business Name
* Contact Name
* Email
* Phone
* Website
* Budget
* Requested Services
* Project Description

Submission Behavior:

* Create Lead
* Store in Supabase
* Success message
* Optional admin email notification

## Admin Portal

Routes:

/admin/dashboard
/admin/business-units
/admin/leads
/admin/clients
/admin/proposals
/admin/projects
/admin/invoices
/admin/expenses
/admin/contractors
/admin/payouts
/admin/reports
/admin/settings

## Business Units

Seed:

* Chandelier Consulting
* AI Consulting
* SaaS Products
* Internal Tools

All major records should optionally belong to a business unit.

## Core Tables

Create SQL migrations and strongly typed access for:

business_units
leads
clients
proposals
projects
invoices
invoice_line_items
payments
expenses
contractors
contractor_payouts
cash_ledger_entries
stripe_events
audit_logs

Include:

* indexes
* foreign keys
* updated_at triggers
* RLS policies

## CRM Flow

Lead
→ Proposal
→ Client
→ Project
→ Invoice
→ Payment

Features:

Leads:

* Kanban board
* Status tracking
* Conversion to client

Clients:

* Search
* Notes
* Revenue history

Proposals:

* Scope of work
* Deliverables
* Pricing
* PDF upload
* Status tracking

Projects:

* Deliverables checklist
* Profitability summary
* Status tracking

## Stripe Invoicing

Implement real Stripe integration.

Features:

* Create/reuse Stripe customer
* Draft invoices
* Custom line items
* Negotiated pricing
* Discounts
* Deposits
* Retainers
* Due dates
* Memos
* Finalize invoice
* Send invoice
* Void invoice
* Sync invoice status

Store:

* Stripe invoice ID
* Hosted invoice URL

Webhook Endpoint:

/api/stripe/webhook

Handle:

* invoice.created
* invoice.finalized
* invoice.sent
* invoice.paid
* invoice.payment_failed
* invoice.voided
* charge.succeeded
* payment_intent.succeeded
* payment_intent.payment_failed

Use idempotency protection.

## Expenses

Features:

* Categorization
* Receipt upload
* Tax deductible flag
* Reimbursable flag
* Business purpose
* Client linkage
* Project linkage

Categories:

* software
* hosting
* domains
* ai_credits
* contractor
* marketing
* legal
* accounting
* office
* equipment
* travel
* meals
* other

## Contractors

Features:

* Contractor profiles
* Tax form status
* Payment method notes
* Project linkage
* Client linkage
* Payout tracking
* Receipt uploads
* CSV export

Do NOT implement actual ACH transfers.

## Cash Ledger

Maintain ledger entries for:

* Invoice payments
* Expenses
* Contractor payouts
* Reimbursements
* Stripe fees
* Refunds
* Adjustments

Provide estimated retained cash calculations.

## Dashboard

Show:

* Revenue this month
* Revenue YTD
* Revenue by business unit
* Outstanding invoices
* Overdue invoices
* Expenses YTD
* Contractor payouts YTD
* Stripe fees
* Net operating profit estimate
* Cash retained estimate
* Top clients
* Most profitable projects

## Reports

Generate:

* Revenue Report
* Expense Report
* Contractor Report
* Client Profitability
* Project Profitability
* Business Unit Profitability
* Cash Ledger Report

CPA Export:

* invoices.csv
* invoice_line_items.csv
* payments.csv
* expenses.csv
* contractor_payouts.csv
* contractors.csv
* clients.csv
* projects.csv
* business_units.csv
* cash_ledger.csv
* summary.csv

Do not calculate taxes.

## Storage Buckets

Create:

* receipts
* contracts
* client-assets
* contractor-invoices
* payment-receipts
* proposal-pdfs

## Security

Implement:

* Supabase Auth
* Admin email allowlist
* Middleware protection
* RLS
* Zod validation
* Secure server actions
* Audit logs
* Environment validation
* Rate limiting

## Environment Variables

NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_APP_URL
ADMIN_EMAILS
RESEND_API_KEY

## Production Requirements

* Mobile responsive
* No mock-only flows
* No TODOs
* No dead code
* No TypeScript errors
* No lint errors
* No exposed secrets

Before completion:

Run:

* npm run typecheck
* npm run lint
* npm run build

Fix all issues.

Generate:

* Full implementation
* SQL migrations
* Setup instructions
* README
* Deployment guide
* Seed data
* Testing checklist
