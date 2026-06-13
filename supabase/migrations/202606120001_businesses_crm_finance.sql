alter table public.businesses
  add column if not exists business_unit_id uuid references public.business_units(id) on delete set null,
  add column if not exists contact_name text,
  add column if not exists email text,
  add column if not exists lead_status text not null default 'lead',
  add column if not exists requested_services text[] not null default '{}',
  add column if not exists project_summary text,
  add column if not exists estimated_value_cents integer not null default 0,
  add column if not exists next_action text,
  add column if not exists next_follow_up_at date,
  add column if not exists stripe_customer_id text;

create index if not exists businesses_lead_status_idx on public.businesses(lead_status);
create index if not exists businesses_stripe_customer_id_idx on public.businesses(stripe_customer_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'businesses_lead_status_check'
  ) then
    alter table public.businesses
      add constraint businesses_lead_status_check
      check (lead_status in ('lead','contacted','proposal','active','completed','paid','lost'));
  end if;
end $$;

insert into public.businesses (
  business_unit_id,
  name,
  contact_name,
  email,
  phone,
  website_found,
  website_url,
  category,
  requested_services,
  project_summary,
  lead_status,
  notes,
  created_at,
  updated_at
)
select
  business_unit_id,
  business_name,
  contact_name,
  email,
  coalesce(nullif(phone, ''), 'lead-' || id::text),
  website is not null and website <> '',
  nullif(website, ''),
  nullif(budget, ''),
  requested_services,
  project_description,
  case status
    when 'new' then 'lead'
    when 'won' then 'active'
    when 'invoiced' then 'completed'
    else status
  end,
  project_description,
  created_at,
  updated_at
from public.leads
on conflict (phone) do update set
  business_unit_id = coalesce(excluded.business_unit_id, public.businesses.business_unit_id),
  name = coalesce(excluded.name, public.businesses.name),
  contact_name = coalesce(excluded.contact_name, public.businesses.contact_name),
  email = coalesce(excluded.email, public.businesses.email),
  website_found = excluded.website_found,
  website_url = coalesce(excluded.website_url, public.businesses.website_url),
  category = coalesce(excluded.category, public.businesses.category),
  requested_services = excluded.requested_services,
  project_summary = coalesce(excluded.project_summary, public.businesses.project_summary),
  lead_status = excluded.lead_status,
  notes = coalesce(excluded.notes, public.businesses.notes),
  updated_at = now();

insert into public.businesses (
  business_unit_id,
  name,
  contact_name,
  email,
  phone,
  notes,
  stripe_customer_id,
  lead_status,
  created_at,
  updated_at
)
select
  business_unit_id,
  name,
  contact_name,
  email,
  coalesce(nullif(phone, ''), 'client-' || id::text),
  notes,
  stripe_customer_id,
  'active',
  created_at,
  updated_at
from public.clients
on conflict (phone) do update set
  business_unit_id = coalesce(excluded.business_unit_id, public.businesses.business_unit_id),
  name = coalesce(excluded.name, public.businesses.name),
  contact_name = coalesce(excluded.contact_name, public.businesses.contact_name),
  email = coalesce(excluded.email, public.businesses.email),
  notes = coalesce(excluded.notes, public.businesses.notes),
  stripe_customer_id = coalesce(excluded.stripe_customer_id, public.businesses.stripe_customer_id),
  lead_status = case when public.businesses.lead_status = 'paid' then public.businesses.lead_status else excluded.lead_status end,
  updated_at = now();

alter table public.invoices add column if not exists business_id uuid references public.businesses(id) on delete set null;
alter table public.expenses add column if not exists business_id uuid references public.businesses(id) on delete set null;
alter table public.contractor_payouts add column if not exists business_id uuid references public.businesses(id) on delete set null;
alter table public.subscription_schedules add column if not exists business_id uuid references public.businesses(id) on delete set null;
alter table public.payments add column if not exists business_id uuid references public.businesses(id) on delete set null;
alter table public.cash_ledger_entries add column if not exists business_id uuid references public.businesses(id) on delete set null;

create index if not exists invoices_business_id_idx on public.invoices(business_id);
create index if not exists expenses_business_id_idx on public.expenses(business_id);
create index if not exists contractor_payouts_business_id_idx on public.contractor_payouts(business_id);
create index if not exists subscription_schedules_business_id_idx on public.subscription_schedules(business_id);
create index if not exists payments_business_id_idx on public.payments(business_id);
create index if not exists cash_ledger_entries_business_id_idx on public.cash_ledger_entries(business_id);

update public.invoices invoice
set business_id = business.id
from public.clients client_record
join public.businesses business on (
  business.stripe_customer_id is not distinct from client_record.stripe_customer_id
  or business.phone is not distinct from client_record.phone
  or business.email is not distinct from client_record.email
  or business.name is not distinct from client_record.name
)
where invoice.client_id = client_record.id
  and invoice.business_id is null;

update public.expenses expense
set business_id = business.id
from public.clients client_record
join public.businesses business on (
  business.stripe_customer_id is not distinct from client_record.stripe_customer_id
  or business.phone is not distinct from client_record.phone
  or business.email is not distinct from client_record.email
  or business.name is not distinct from client_record.name
)
where expense.client_id = client_record.id
  and expense.business_id is null;

update public.contractor_payouts payout
set business_id = business.id
from public.clients client_record
join public.businesses business on (
  business.stripe_customer_id is not distinct from client_record.stripe_customer_id
  or business.phone is not distinct from client_record.phone
  or business.email is not distinct from client_record.email
  or business.name is not distinct from client_record.name
)
where payout.client_id = client_record.id
  and payout.business_id is null;

update public.subscription_schedules schedule
set business_id = business.id
from public.clients client_record
join public.businesses business on (
  business.stripe_customer_id is not distinct from client_record.stripe_customer_id
  or business.phone is not distinct from client_record.phone
  or business.email is not distinct from client_record.email
  or business.name is not distinct from client_record.name
)
where schedule.client_id = client_record.id
  and schedule.business_id is null;

update public.payments payment
set business_id = invoice.business_id
from public.invoices invoice
where payment.invoice_id = invoice.id
  and payment.business_id is null;

update public.cash_ledger_entries ledger
set business_id = invoice.business_id
from public.invoices invoice
where ledger.source_table = 'invoices'
  and ledger.source_id = invoice.id
  and ledger.business_id is null;

alter table public.invoices drop column if exists client_id;
alter table public.invoices drop column if exists project_id;
alter table public.expenses drop column if exists client_id;
alter table public.expenses drop column if exists project_id;
alter table public.contractor_payouts drop column if exists client_id;
alter table public.contractor_payouts drop column if exists project_id;
alter table public.subscription_schedules drop column if exists client_id;

drop table if exists public.projects cascade;
drop table if exists public.proposals cascade;
drop table if exists public.clients cascade;
drop table if exists public.leads cascade;

do $$
begin
  begin
    execute 'create trigger set_businesses_updated_at before update on public.businesses for each row execute function public.set_updated_at()';
  exception
    when duplicate_object then null;
  end;
end $$;

alter table public.businesses enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'businesses' and policyname = 'businesses_admin_select') then
    create policy "businesses_admin_select" on public.businesses for select using (public.is_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'businesses' and policyname = 'businesses_admin_insert') then
    create policy "businesses_admin_insert" on public.businesses for insert with check (public.is_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'businesses' and policyname = 'businesses_admin_update') then
    create policy "businesses_admin_update" on public.businesses for update using (public.is_admin()) with check (public.is_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'businesses' and policyname = 'businesses_admin_delete') then
    create policy "businesses_admin_delete" on public.businesses for delete using (public.is_admin());
  end if;
end $$;
