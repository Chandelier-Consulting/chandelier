create extension if not exists "pgcrypto";

-- Pipeline clients table.
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text,
  legal_name text,
  display_name text,
  contact_name text,
  email text,
  phone text,
  company_website text,
  billing_email text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.clients
  add column if not exists legal_name text,
  add column if not exists display_name text,
  add column if not exists contact_name text,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists company_website text,
  add column if not exists billing_email text,
  add column if not exists address text,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

alter table public.clients
  alter column created_at set default now(),
  alter column updated_at set default now();

update public.clients
  set legal_name = coalesce(nullif(trim(legal_name), ''), coalesce(nullif(trim(display_name), ''), nullif(trim(name), ''), 'Client'))
where legal_name is null
   or trim(legal_name) = '';

update public.clients
  set name = legal_name
where name is null
   or trim(name) = '';

create table if not exists public.billing_patterns (
  id text primary key,
  name text not null,
  description text,
  steps jsonb not null default '[]'::jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  name text not null,
  status text not null default 'active',
  phase text not null default 'lead_qualified',
  total_amount_cents integer not null default 0,
  currency text not null default 'USD',
  billing_pattern_id text references public.billing_patterns(id) on delete set null,
  scope_summary text,
  deliverables jsonb not null default '[]'::jsonb,
  start_date date,
  target_end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects
  add column if not exists client_id uuid references public.clients(id) on delete set null,
  add column if not exists status text,
  add column if not exists phase text,
  add column if not exists total_amount_cents integer,
  add column if not exists currency text,
  add column if not exists billing_pattern_id text references public.billing_patterns(id) on delete set null,
  add column if not exists scope_summary text,
  add column if not exists deliverables jsonb,
  add column if not exists start_date date,
  add column if not exists target_end_date date,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

alter table public.projects
  alter column status set default 'active',
  alter column phase set default 'lead_qualified',
  alter column total_amount_cents set default 0,
  alter column currency set default 'USD',
  alter column deliverables set default '[]'::jsonb,
  alter column created_at set default now(),
  alter column updated_at set default now();

create table if not exists public.phase_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  phase text not null,
  action text not null,
  actor_uid text,
  actor_email text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  type text not null,
  title text not null,
  status text not null default 'draft',
  template_path text,
  generated_docx_path text,
  generated_pdf_path text,
  signed_pdf_path text,
  issued_at timestamptz,
  viewed_at timestamptz,
  signed_at timestamptz,
  signer_name text,
  signer_email text,
  signing_token_hash text,
  audit_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, type)
);

create table if not exists public.billing_steps (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  label text not null,
  trigger_phase text not null,
  amount_cents integer not null default 0,
  percentage numeric,
  status text not null default 'planned',
  due_date date,
  stripe_invoice_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.signing_sessions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  signer_email text,
  signer_name text,
  token_hash text not null,
  expires_at timestamptz not null,
  status text not null default 'active',
  viewed_at timestamptz,
  signed_at timestamptz,
  ip_address text,
  user_agent text,
  consent_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_client_id_idx on public.projects(client_id);
create index if not exists projects_phase_idx on public.projects(phase);
create index if not exists projects_billing_pattern_id_idx on public.projects(billing_pattern_id);
create index if not exists documents_project_id_idx on public.documents(project_id);
create index if not exists documents_status_idx on public.documents(status);
create index if not exists billing_steps_project_id_idx on public.billing_steps(project_id);
create index if not exists billing_steps_status_idx on public.billing_steps(status);
create index if not exists phase_events_project_id_idx on public.phase_events(project_id);
create index if not exists signing_sessions_project_id_idx on public.signing_sessions(project_id);
create index if not exists signing_sessions_document_id_idx on public.signing_sessions(document_id);
create index if not exists signing_sessions_status_idx on public.signing_sessions(status);

-- Keep client names and status fields usable from existing legacy references.
update public.projects
  set name = coalesce(nullif(trim(name), ''), 'Project')
where name is null
   or trim(name) = '';

update public.projects
  set phase = coalesce(nullif(phase, ''), 'lead_qualified')
where phase is null
   or trim(phase) = '';

update public.projects
  set status = coalesce(nullif(status, ''), 'active')
where status is null
   or trim(status) = '';

update public.projects
  set total_amount_cents = coalesce(total_amount_cents, 0)
where total_amount_cents is null;

update public.projects
  set currency = coalesce(nullif(trim(currency), ''), 'USD')
where currency is null
   or trim(currency) = '';

update public.projects
  set deliverables = coalesce(deliverables, '[]'::jsonb)
where deliverables is null;

-- Seed billing patterns used by the admin project pipeline.
insert into public.billing_patterns (id, name, description, steps, is_default, created_at, updated_at)
values
  (
    '50-50',
    '50% Deposit / 50% Final',
    'Deposit milestone then final invoice.',
    '[
      {"label": "Deposit (50%)", "triggerPhase": "deposit_invoice_ready", "percentage": 50},
      {"label": "Final (50%)", "triggerPhase": "final_invoice_ready", "percentage": 50}
    ]'::jsonb,
    true,
    now(),
    now()
  ),
  (
    '40-30-30',
    '40% Deposit / 30% Midpoint / 30% Final',
    'Three milestone split for medium-sized build work.',
    '[
      {"label": "Deposit (40%)", "triggerPhase": "deposit_invoice_ready", "percentage": 40},
      {"label": "Midpoint (30%)", "triggerPhase": "revision", "percentage": 30},
      {"label": "Final (30%)", "triggerPhase": "final_invoice_ready", "percentage": 30}
    ]'::jsonb,
    false,
    now(),
    now()
  ),
  (
    'monthly-retainer',
    'Monthly Retainer',
    'Retainer invoice at build-active kickoff.',
    '[
      {"label": "Monthly Retainer", "triggerPhase": "build_active", "percentage": 100}
    ]'::jsonb,
    false,
    now(),
    now()
  )
on conflict (id) do update
  set
    name = excluded.name,
    description = excluded.description,
    steps = excluded.steps,
    is_default = excluded.is_default,
    updated_at = now();

update public.billing_patterns
set is_default = (id = '50-50')
where id in ('50-50', '40-30-30', 'monthly-retainer');

-- Storage support for generated documents (private, admin/privileged access only).
insert into storage.buckets (id, name, public)
values ('project-documents', 'project-documents', false)
on conflict (id) do nothing;

-- Timestamp maintenance for new tables.
do $$
declare
  table_name text;
begin
  foreach table_name in ARRAY[
  'clients',
  'projects',
  'phase_events',
  'documents',
  'billing_patterns',
  'billing_steps',
  'signing_sessions'
  ]
  loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format(
        'create trigger if not exists set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
        table_name,
        table_name
      );
    end if;
  end loop;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_proc
    where pronamespace = (select oid from pg_namespace where nspname = 'public')
      and proname = 'is_admin'
  ) then
    return;
  end if;

  if to_regclass('public.clients') is not null then
    execute 'alter table public.clients enable row level security';
    if not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = 'clients' and policyname = 'clients_admin_select'
    ) then
      execute 'create policy clients_admin_select on public.clients for select using (public.is_admin())';
    end if;
    if not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = 'clients' and policyname = 'clients_admin_insert'
    ) then
      execute 'create policy clients_admin_insert on public.clients for insert with check (public.is_admin())';
    end if;
    if not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = 'clients' and policyname = 'clients_admin_update'
    ) then
      execute 'create policy clients_admin_update on public.clients for update using (public.is_admin()) with check (public.is_admin())';
    end if;
    if not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = 'clients' and policyname = 'clients_admin_delete'
    ) then
      execute 'create policy clients_admin_delete on public.clients for delete using (public.is_admin())';
    end if;
  end if;

  if to_regclass('public.projects') is not null then
    execute 'alter table public.projects enable row level security';
    if not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = 'projects' and policyname = 'projects_admin_select'
    ) then
      execute 'create policy projects_admin_select on public.projects for select using (public.is_admin())';
    end if;
    if not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = 'projects' and policyname = 'projects_admin_insert'
    ) then
      execute 'create policy projects_admin_insert on public.projects for insert with check (public.is_admin())';
    end if;
    if not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = 'projects' and policyname = 'projects_admin_update'
    ) then
      execute 'create policy projects_admin_update on public.projects for update using (public.is_admin()) with check (public.is_admin())';
    end if;
    if not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = 'projects' and policyname = 'projects_admin_delete'
    ) then
      execute 'create policy projects_admin_delete on public.projects for delete using (public.is_admin())';
    end if;
  end if;

  if to_regclass('public.phase_events') is not null then
    execute 'alter table public.phase_events enable row level security';
    if not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = 'phase_events' and policyname = 'phase_events_admin_select'
    ) then
      execute 'create policy phase_events_admin_select on public.phase_events for select using (public.is_admin())';
    end if;
    if not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = 'phase_events' and policyname = 'phase_events_admin_insert'
    ) then
      execute 'create policy phase_events_admin_insert on public.phase_events for insert with check (public.is_admin())';
    end if;
    if not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = 'phase_events' and policyname = 'phase_events_admin_update'
    ) then
      execute 'create policy phase_events_admin_update on public.phase_events for update using (public.is_admin()) with check (public.is_admin())';
    end if;
    if not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = 'phase_events' and policyname = 'phase_events_admin_delete'
    ) then
      execute 'create policy phase_events_admin_delete on public.phase_events for delete using (public.is_admin())';
    end if;
  end if;

  if to_regclass('public.documents') is not null then
    execute 'alter table public.documents enable row level security';
    if not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = 'documents' and policyname = 'documents_admin_select'
    ) then
      execute 'create policy documents_admin_select on public.documents for select using (public.is_admin())';
    end if;
    if not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = 'documents' and policyname = 'documents_admin_insert'
    ) then
      execute 'create policy documents_admin_insert on public.documents for insert with check (public.is_admin())';
    end if;
    if not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = 'documents' and policyname = 'documents_admin_update'
    ) then
      execute 'create policy documents_admin_update on public.documents for update using (public.is_admin()) with check (public.is_admin())';
    end if;
    if not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = 'documents' and policyname = 'documents_admin_delete'
    ) then
      execute 'create policy documents_admin_delete on public.documents for delete using (public.is_admin())';
    end if;
  end if;

  if to_regclass('public.billing_steps') is not null then
    execute 'alter table public.billing_steps enable row level security';
    if not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = 'billing_steps' and policyname = 'billing_steps_admin_select'
    ) then
      execute 'create policy billing_steps_admin_select on public.billing_steps for select using (public.is_admin())';
    end if;
    if not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = 'billing_steps' and policyname = 'billing_steps_admin_insert'
    ) then
      execute 'create policy billing_steps_admin_insert on public.billing_steps for insert with check (public.is_admin())';
    end if;
    if not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = 'billing_steps' and policyname = 'billing_steps_admin_update'
    ) then
      execute 'create policy billing_steps_admin_update on public.billing_steps for update using (public.is_admin()) with check (public.is_admin())';
    end if;
    if not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = 'billing_steps' and policyname = 'billing_steps_admin_delete'
    ) then
      execute 'create policy billing_steps_admin_delete on public.billing_steps for delete using (public.is_admin())';
    end if;
  end if;

  if to_regclass('public.signing_sessions') is not null then
    execute 'alter table public.signing_sessions enable row level security';
    if not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = 'signing_sessions' and policyname = 'signing_sessions_admin_select'
    ) then
      execute 'create policy signing_sessions_admin_select on public.signing_sessions for select using (public.is_admin())';
    end if;
    if not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = 'signing_sessions' and policyname = 'signing_sessions_admin_insert'
    ) then
      execute 'create policy signing_sessions_admin_insert on public.signing_sessions for insert with check (public.is_admin())';
    end if;
    if not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = 'signing_sessions' and policyname = 'signing_sessions_admin_update'
    ) then
      execute 'create policy signing_sessions_admin_update on public.signing_sessions for update using (public.is_admin()) with check (public.is_admin())';
    end if;
    if not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = 'signing_sessions' and policyname = 'signing_sessions_admin_delete'
    ) then
      execute 'create policy signing_sessions_admin_delete on public.signing_sessions for delete using (public.is_admin())';
    end if;
  end if;

  if to_regclass('public.billing_patterns') is not null then
    execute 'alter table public.billing_patterns enable row level security';
    if not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = 'billing_patterns' and policyname = 'billing_patterns_admin_select'
    ) then
      execute 'create policy billing_patterns_admin_select on public.billing_patterns for select using (public.is_admin())';
    end if;
    if not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = 'billing_patterns' and policyname = 'billing_patterns_admin_insert'
    ) then
      execute 'create policy billing_patterns_admin_insert on public.billing_patterns for insert with check (public.is_admin())';
    end if;
    if not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = 'billing_patterns' and policyname = 'billing_patterns_admin_update'
    ) then
      execute 'create policy billing_patterns_admin_update on public.billing_patterns for update using (public.is_admin()) with check (public.is_admin())';
    end if;
    if not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = 'billing_patterns' and policyname = 'billing_patterns_admin_delete'
    ) then
      execute 'create policy billing_patterns_admin_delete on public.billing_patterns for delete using (public.is_admin())';
    end if;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'project_documents_admin_select'
  ) then
    execute $$
      create policy project_documents_admin_select
      on storage.objects
      for select
      using (bucket_id = 'project-documents' and public.is_admin())
    $$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'project_documents_admin_insert'
  ) then
    execute $$
      create policy project_documents_admin_insert
      on storage.objects
      for insert
      with check (bucket_id = 'project-documents' and public.is_admin())
    $$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'project_documents_admin_update'
  ) then
    execute $$
      create policy project_documents_admin_update
      on storage.objects
      for update
      using (bucket_id = 'project-documents' and public.is_admin())
      with check (bucket_id = 'project-documents' and public.is_admin())
    $$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'project_documents_admin_delete'
  ) then
    execute $$
      create policy project_documents_admin_delete
      on storage.objects
      for delete
      using (bucket_id = 'project-documents' and public.is_admin())
    $$;
  end if;
end
$$;
