# Testing Checklist

## Public Site

- Visit `/`, `/services`, `/pricing`, `/portfolio`, and `/contact`.
- Confirm Chandelier Consulting is the visible brand.
- Confirm the footer says Chandelier Consulting is operated by Perceo Inc.
- Submit the contact form with valid data.
- Submit the contact form with invalid data and confirm validation errors are returned.

## Admin Portal

- Visit `/admin/dashboard`.
- Visit every admin module route from `spec.md`.
- Confirm report downloads return CSV files.
- Confirm admin access is blocked when `ADMIN_EMAILS` is set and no allowlisted admin identity is present.

## Supabase

- Run the migration.
- Confirm all tables exist.
- Confirm RLS is enabled.
- Confirm the six storage buckets exist.
- Confirm a public lead insert works.
- Confirm admin policies require the allowlist.

## Stripe

- Create a draft invoice through `/api/stripe/invoices`.
- Confirm the invoice is created in Stripe.
- Confirm the local invoice row stores the Stripe invoice ID.
- Create a fixed-month monthly subscription through `/api/stripe/subscriptions`.
- Confirm Stripe creates a subscription schedule that cancels after the selected number of months.
- Confirm the local subscription schedule row stores the Stripe schedule ID.
- Send a signed webhook test event.
- Confirm duplicate webhook events are ignored through `stripe_events`.

## Build

Run:

```bash
npm run typecheck
npm run lint
npm run build
```
