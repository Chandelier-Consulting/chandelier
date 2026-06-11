# Deployment and Configuration Guide

## Production Target

- App host: Vercel
- Production domain: `https://chandelierconsulting.dev`
- Database, storage, and auth provider: Supabase
- Payments and invoicing: Stripe
- Build command: `npm run build`
- Runtime framework: Next.js App Router

## Environment Variables

Set these in Vercel for Production, Preview, and Development as appropriate.

```bash
NEXT_PUBLIC_APP_URL=https://chandelierconsulting.dev

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

ADMIN_EMAILS=admin@example.com
RESEND_API_KEY=
```

## Variable Notes

- `NEXT_PUBLIC_APP_URL`: Public base URL for the deployed app. Use `http://localhost:3000` locally.
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Supabase publishable key (`sb_publishable_...`). Safe for browser use with RLS enabled, but still keep it in env.
- `SUPABASE_SECRET_KEY`: Server-only Supabase secret key (`sb_secret_...`). Never expose this client-side.
- `STRIPE_SECRET_KEY`: Server-only Stripe secret key. Use `sk_live_...` in production and `sk_test_...` locally/staging.
- `STRIPE_WEBHOOK_SECRET`: Signing secret from the Stripe webhook endpoint.
- `ADMIN_EMAILS`: Comma-separated allowlist for `/admin` access, for example `owner@example.com,ops@example.com`.
- `RESEND_API_KEY`: Reserved for email sending. It is defined in env validation but not currently wired to an email route.

## Local Setup

Create `.env.local`:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
ADMIN_EMAILS=admin@example.com
RESEND_API_KEY=
```

Install and verify:

```bash
npm install
npm run typecheck
npm run lint
npm run build
npm run dev
```

Open `http://localhost:3000`.

## Supabase Setup

1. Create a Supabase project.
2. Copy the project URL into `NEXT_PUBLIC_SUPABASE_URL`.
3. Copy the publishable key into `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
4. Copy the secret key into `SUPABASE_SECRET_KEY`.
5. Run the migration:

```bash
supabase db push
```

The migration file is:

```text
supabase/migrations/202606110001_initial_os.sql
```

It creates the app tables, admin RLS policies, lead insert policy, storage buckets, and seed business units.

## Supabase Storage Buckets

Confirm these private buckets exist:

- `receipts`
- `contracts`
- `client-assets`
- `contractor-invoices`
- `payment-receipts`
- `proposal-pdfs`

## Admin Access

The admin portal lives under:

```text
/admin
/admin/dashboard
/admin/invoices
```

The current guard is in `proxy.ts`.

Behavior:

- If `ADMIN_EMAILS` is empty, `/admin` is open.
- If `ADMIN_EMAILS` is set, `/admin` redirects to `/admin/login` until Supabase Auth provides a session for an allowlisted email.
- The Supabase magic-link callback stores server-readable HTTP-only session cookies used by `proxy.ts`.

## Stripe Setup

1. Create or use an existing Stripe account.
2. Add `STRIPE_SECRET_KEY` to Vercel.
3. Create a webhook endpoint in Stripe:

```text
https://chandelierconsulting.dev/api/stripe/webhook
```

4. Subscribe the webhook to:

- `invoice.created`
- `invoice.finalized`
- `invoice.sent`
- `invoice.paid`
- `invoice.payment_failed`
- `invoice.voided`
- `charge.succeeded`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `subscription_schedule.created`
- `subscription_schedule.updated`
- `subscription_schedule.canceled`
- `subscription_schedule.completed`

5. Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET`.

## Stripe Routes

Yes, the Stripe implementation is in Next.js route handlers under `app/api/stripe`.

Current Stripe routes:

```text
POST /api/stripe/invoices
POST /api/stripe/invoices/finalize
POST /api/stripe/invoices/send
POST /api/stripe/invoices/void
POST /api/stripe/subscriptions
POST /api/stripe/webhook
```

Supporting shared code:

```text
lib/stripe.ts
lib/validation.ts
lib/env.ts
```

The admin UI that calls the invoice/subscription routes is:

```text
components/invoice-workbench.tsx
```

## Stripe Behavior

- One-time invoices are created as Stripe draft invoices.
- Invoice line items, discounts, deposit credits, and retainers are sent to Stripe as invoice items.
- Admins can finalize, send, and void one-time invoices from the admin invoice screen.
- Fixed-month subscriptions are created as Stripe Subscription Schedules.
- Subscription schedules invoice monthly and cancel automatically after the selected month count.
- Stripe webhooks sync invoice status, hosted invoice URLs, paid payments, Stripe fees, and subscription schedule status back into Supabase.

## Vercel Deployment

1. Connect this repo to Vercel.
2. Set framework to Next.js.
3. Use the default install command:

```bash
npm install
```

4. Use the build command:

```bash
npm run build
```

5. Add all environment variables listed above.
6. Assign `chandelierconsulting.dev` as the production domain.
7. Deploy.

## Post-Deploy Smoke Test

Run these checks after deployment:

- Visit `https://chandelierconsulting.dev`.
- Confirm the chandelier image loads.
- Visit `/services`, `/pricing`, `/portfolio`, and `/contact`.
- Submit the contact form with valid data.
- Confirm the lead appears in Supabase.
- Visit `/admin/dashboard`.
- Confirm admin access is blocked unless the admin identity is allowlisted.
- Visit `/admin/invoices`.
- Create a test Stripe draft invoice in test mode.
- Create a fixed-month subscription schedule in test mode.
- Trigger Stripe webhook test events.
- Confirm rows update in `invoices`, `payments`, `stripe_events`, and `subscription_schedules`.

## Required Verification Before Shipping

Run:

```bash
npm run typecheck
npm run lint
npm run build
```

Do not ship if any of these fail.
