# Chandelier Consulting OS

Production-oriented Next.js app for Chandelier Consulting, operated by Perceo Inc.

## What Is Included

- Public marketing site routes: `/`, `/services`, `/pricing`, `/portfolio`, `/contact`
- Lead intake API: `/api/leads`
- Admin portal routes: `/admin/dashboard` plus all modules listed in `spec.md`
- Stripe invoice creation API: `/api/stripe/invoices`
- Stripe fixed-month subscription API: `/api/stripe/subscriptions`
- Stripe webhook endpoint: `/api/stripe/webhook`
- CPA export route: `/api/reports/[report]`
- Supabase migration and seed data
- Branded app icon and metadata

## Stack

- Next.js 16.2.9 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase
- Stripe
- Zod

## Environment

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
ADMIN_EMAILS=admin@example.com
RESEND_API_KEY=
```

`ADMIN_EMAILS` is a comma-separated allowlist. When it is set, `/admin` requires Supabase email/password auth through `/admin/login`; after Supabase authenticates the user, the session email must be allowlisted to enter.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Database Setup

Run the migration in `supabase/migrations/202606110001_initial_os.sql`, then seed:

```bash
supabase db push
supabase db reset
```

The migration creates:

- `business_units`
- `leads`
- `clients`
- `proposals`
- `projects`
- `invoices`
- `invoice_line_items`
- `payments`
- `expenses`
- `contractors`
- `contractor_payouts`
- `cash_ledger_entries`
- `stripe_events`
- `subscription_schedules`
- `audit_logs`

It also creates the storage buckets listed in the spec.

## Verification

```bash
npm run typecheck
npm run lint
npm run build
```

## Notes

This is bookkeeping support, not tax advice. Consult a CPA.
