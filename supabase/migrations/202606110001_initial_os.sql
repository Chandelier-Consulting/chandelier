create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'email', '') = any (
    string_to_array(coalesce(current_setting('app.admin_emails', true), ''), ',')
  );
$$;

create table public.business_units (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  business_unit_id uuid references public.business_units(id) on delete set null,
  business_name text not null,
  contact_name text not null,
  email text not null,
  phone text,
  website text,
  budget text,
  requested_services text[] not null default '{}',
  project_description text not null,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  business_unit_id uuid references public.business_units(id) on delete set null,
  name text not null,
  contact_name text,
  email text,
  phone text,
  notes text,
  stripe_customer_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  business_unit_id uuid references public.business_units(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  scope_of_work text not null,
  deliverables jsonb not null default '[]',
  pricing_cents integer not null default 0,
  pdf_path text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  business_unit_id uuid references public.business_units(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  proposal_id uuid references public.proposals(id) on delete set null,
  name text not null,
  deliverables jsonb not null default '[]',
  status text not null default 'active',
  budget_cents integer not null default 0,
  cost_cents integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  business_unit_id uuid references public.business_units(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  stripe_invoice_id text unique,
  hosted_invoice_url text,
  status text not null default 'draft',
  subtotal_cents integer not null default 0,
  discount_cents integer not null default 0,
  deposit_cents integer not null default 0,
  retainer_cents integer not null default 0,
  total_cents integer not null default 0,
  due_date date,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  quantity numeric not null default 1,
  unit_amount_cents integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references public.invoices(id) on delete set null,
  stripe_payment_intent_id text unique,
  amount_cents integer not null,
  stripe_fee_cents integer not null default 0,
  status text not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  business_unit_id uuid references public.business_units(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  category text not null check (category in ('software','hosting','domains','ai_credits','contractor','marketing','legal','accounting','office','equipment','travel','meals','other')),
  amount_cents integer not null,
  receipt_path text,
  tax_deductible boolean not null default true,
  reimbursable boolean not null default false,
  business_purpose text not null,
  spent_at date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contractors (
  id uuid primary key default gen_random_uuid(),
  business_unit_id uuid references public.business_units(id) on delete set null,
  name text not null,
  email text,
  tax_form_status text not null default 'not_requested',
  payment_method_notes text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contractor_payouts (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references public.contractors(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  amount_cents integer not null,
  receipt_path text,
  status text not null default 'tracked',
  paid_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cash_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  business_unit_id uuid references public.business_units(id) on delete set null,
  entry_type text not null check (entry_type in ('invoice_payment','expense','contractor_payout','reimbursement','stripe_fee','refund','adjustment')),
  source_table text,
  source_id uuid,
  amount_cents integer not null,
  memo text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.stripe_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscription_schedules (
  id uuid primary key default gen_random_uuid(),
  business_unit_id uuid references public.business_units(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  stripe_customer_id text not null,
  stripe_subscription_schedule_id text not null unique,
  stripe_subscription_id text,
  status text not null,
  months integer not null,
  monthly_total_cents integer not null,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_email text,
  action text not null,
  table_name text,
  record_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.leads(status);
create index on public.clients(name);
create index on public.proposals(status);
create index on public.projects(status);
create index on public.invoices(status);
create index on public.expenses(category);
create index on public.contractor_payouts(contractor_id);
create index on public.cash_ledger_entries(entry_type);
create index on public.subscription_schedules(status);

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'business_units','leads','clients','proposals','projects','invoices',
    'invoice_line_items','payments','expenses','contractors','contractor_payouts',
    'cash_ledger_entries','stripe_events','subscription_schedules','audit_logs'
  ]
  loop
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
    execute format('alter table public.%I enable row level security', table_name);
    execute format('create policy "%I_admin_select" on public.%I for select using (public.is_admin())', table_name, table_name);
    execute format('create policy "%I_admin_insert" on public.%I for insert with check (public.is_admin())', table_name, table_name);
    execute format('create policy "%I_admin_update" on public.%I for update using (public.is_admin()) with check (public.is_admin())', table_name, table_name);
    execute format('create policy "%I_admin_delete" on public.%I for delete using (public.is_admin())', table_name, table_name);
  end loop;
end $$;

create policy "public_lead_insert" on public.leads
for insert
with check (true);

insert into public.business_units (name, slug, description) values
  ('Chandelier Consulting', 'chandelier-consulting', 'Public consulting services.'),
  ('AI Consulting', 'ai-consulting', 'AI deployment and automation engagements.'),
  ('SaaS Products', 'saas-products', 'Productized software revenue.'),
  ('Internal Tools', 'internal-tools', 'Internal systems and operating tooling.')
on conflict (slug) do nothing;

insert into storage.buckets (id, name, public) values
  ('receipts', 'receipts', false),
  ('contracts', 'contracts', false),
  ('client-assets', 'client-assets', false),
  ('contractor-invoices', 'contractor-invoices', false),
  ('payment-receipts', 'payment-receipts', false),
  ('proposal-pdfs', 'proposal-pdfs', false)
on conflict (id) do nothing;
