-- Existing migration for the linked smb-scraper Supabase project.
-- This file mirrors the already-applied remote migration version `0001` so
-- future `supabase db push` runs do not treat the existing project history as
-- drift. Do not rewrite this file for Chandelier changes; add new migrations.

create extension if not exists "pgcrypto";

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text,
  phone text not null,
  category text,
  address text,
  city text,
  state text,
  postal_code text,
  source_url text,
  notes text,
  website_found boolean default false,
  website_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint businesses_phone_unique unique (phone)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger businesses_updated_at
  before update on public.businesses
  for each row execute function public.set_updated_at();

create table if not exists public.scrape_config (
  id int primary key default 1,
  geos jsonb not null default '[]'::jsonb,
  categories text[] not null default '{}',
  dedupe_key text not null default 'phone',
  no_website_rule jsonb not null default '{"mode":"listing_only"}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint scrape_config_single_row check (id = 1)
);

create or replace trigger scrape_config_updated_at
  before update on public.scrape_config
  for each row execute function public.set_updated_at();

insert into public.scrape_config (id, geos, categories, dedupe_key, no_website_rule)
values (
  1,
  '["San Francisco Bay Area, CA","Seattle, WA","Portland, OR"]'::jsonb,
  array[
    'plumber',
    'electrician',
    'hvac',
    'locksmith',
    'roofing',
    'landscaping',
    'pest control',
    'cleaning',
    'garage door repair',
    'handyman',
    'moving',
    'pool service',
    'sprinkler repair',
    'auto repair',
    'auto body'
  ],
  'phone',
  '{"mode":"listing_only"}'::jsonb
)
on conflict (id) do nothing;

create table if not exists public.runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz default now(),
  finished_at timestamptz,
  status text not null default 'running',
  record_count int
);
