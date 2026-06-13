# Admin CRM and Finance Redesign

## Goal

Make the admin UI useful for one owner running Chandelier: track companies, current stats, invoices, contractor payouts, and reimbursements without turning the app into bookkeeping overhead.

The admin must be simple, good-looking, and fast to operate. Supabase is the source of truth for UI reads. Stripe is accessed only through server API routes and webhook processing.

## Current Problem

The admin UI is organized around many separate tabs: leads, clients, proposals, projects, invoices, expenses, contractors, payouts, reports, and settings. That creates too much ceremony for the actual workflow.

The database also has two competing CRM shapes:

- `businesses`, from the existing project migration, already contains scraped/local business leads.
- `leads`, `clients`, `proposals`, and `projects` model a heavier consulting OS.

The useful direction is to make `businesses` the CRM source of truth and keep finance records separate only where they represent real money events.

## Admin Information Architecture

The admin should collapse to four areas:

1. `Dashboard`
   - Current revenue and cash metrics.
   - CRM pipeline counts and estimated value.
   - Open invoices.
   - Contractor payouts owed.
   - Reimbursements owed to the owner.

2. `CRM`
   - One list/pipeline of `businesses`.
   - Status moves a business from lead to paid/completed.
   - Each business shows company, contact, project/service summary, estimated value, next action, invoice state, and payment state.
   - Invoice creation should be available from a business without needing to visit multiple separate tabs.

3. `Finances`
   - Easy invoice creation.
   - Open invoices and recent payments.
   - Contractor payouts owed or paid.
   - Owner reimbursements and expenses.
   - This page should answer "what money needs attention?" without recreating Stripe's full dashboard.

4. `Settings`
   - Admin auth/environment health.
   - Supabase/Stripe configuration visibility.

## CRM Source of Truth

`businesses` becomes the single source of truth for companies across the whole lifecycle.

Recommended status flow:

- `lead`
- `contacted`
- `proposal`
- `active`
- `completed`
- `paid`
- `lost`

The table should be extended with owner-friendly CRM fields:

- Primary contact name.
- Email.
- Lead/client status.
- Requested services or project summary.
- Estimated value in cents.
- Next action.
- Next follow-up date.
- Stripe customer id.
- Internal notes.

Existing `leads` records should be migrated into `businesses`. The admin should stop using `leads`, `clients`, `proposals`, and `projects` as separate workflow tables after migration.

## Finance Data Model

Keep separate finance tables because they represent real accounting events and need clean reporting:

- `invoices`
- `invoice_line_items`
- `payments`
- `expenses`
- `contractors`
- `contractor_payouts`
- `subscription_schedules`
- `cash_ledger_entries`

Finance tables should link to `businesses` instead of `clients` or `projects`. Existing records that cannot be matched to a business during migration must remain valid with a null `business_id` and still appear in finance totals.

## Stripe Boundary

Admin pages must load from Supabase only.

Stripe calls must stay behind server routes:

- `/api/stripe/invoices`
- `/api/stripe/billing`
- `/api/stripe/invoices/finalize`
- `/api/stripe/invoices/send`
- `/api/stripe/invoices/void`
- `/api/stripe/webhook`

Invoice creation from the admin should:

1. Submit to an internal `/api/stripe/*` route.
2. Create or reuse the Stripe customer.
3. Create invoice items and the Stripe invoice.
4. Save invoice and line-item records to Supabase.
5. Return the local invoice state for the UI.

Webhook handling should validate and update the in-house record:

- Invoice status.
- Hosted invoice URL.
- Invoice totals.
- Payment records.
- Stripe fees.
- Cash ledger entries where applicable.

Supabase remains the UI read model. Stripe webhooks correct and validate status over time.

## UI Principles

The admin should feel like an operating cockpit, not a database browser:

- Fewer tabs.
- Dense, readable tables and task lists.
- Clear money totals.
- Direct actions near the relevant business or invoice.
- No separate "convert lead to client" workflow.
- No duplicate proposal/project/client record-keeping unless it serves invoice creation or reporting.

## Testing

Add or update tests for:

- Dashboard summary from `businesses`, invoices, payments, expenses, and payouts.
- CRM row formatting and status pipeline counts.
- Mutation payloads for `businesses`.
- Report definitions after table consolidation.
- Invoice route persistence to Supabase.
- Webhook sync behavior for invoice and payment status where existing tests already cover Stripe billing.

## Migration Strategy

Use additive migrations first, then stop reading old workflow tables from the app.

1. Add CRM fields to `businesses`.
2. Add `business_id` references to finance tables.
3. Backfill `businesses` from all `leads` and `clients`.
4. Backfill finance `business_id` from current client/project relationships. If no reliable match exists, keep `business_id` null and preserve the finance record.
5. Update the app to use `businesses`.
6. Drop or retire `leads`, `clients`, `proposals`, and `projects` after dependent code no longer uses them.

The implementation can include the drop migration if the app has been fully updated and the migration preserves useful existing data.
