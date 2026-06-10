-- Boss Up Bootcamp registration + calendar control room schema
-- Apply in Supabase SQL editor for project: https://klnfdnjsfbedtesdvvju.supabase.co

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.bootcamp_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null default 'Boss Up Bootcamp',
  description text,
  starts_at timestamptz,
  ends_at timestamptz,
  timezone text not null default 'America/New_York',
  location text,
  seat_limit integer not null default 20 check (seat_limit > 0),
  price_cents integer not null default 2500 check (price_cents >= 0),
  currency text not null default 'usd',
  is_published boolean not null default false,
  is_archived boolean not null default false,
  notes text
);

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  event_id uuid references public.bootcamp_events(id) on delete set null,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  stripe_customer_id text,
  stripe_payment_link_id text,
  payment_status text not null default 'pending',
  amount_total integer,
  currency text,
  attendee_name text,
  attendee_email text,
  attendee_phone text,
  interest text,
  checked_in boolean not null default false,
  checked_in_at timestamptz,
  admin_notes text,
  raw_stripe jsonb,
  source text not null default 'stripe_payment_link'
);

create index if not exists bootcamp_events_starts_at_idx on public.bootcamp_events (starts_at asc);
create index if not exists bootcamp_events_published_idx on public.bootcamp_events (is_published, is_archived, starts_at asc);
create index if not exists registrations_event_id_idx on public.registrations (event_id);
create index if not exists registrations_created_at_idx on public.registrations (created_at desc);
create index if not exists registrations_email_idx on public.registrations (lower(attendee_email));
create index if not exists registrations_payment_status_idx on public.registrations (payment_status);

create or replace trigger bootcamp_events_set_updated_at
before update on public.bootcamp_events
for each row execute function public.set_updated_at();

create or replace trigger registrations_set_updated_at
before update on public.registrations
for each row execute function public.set_updated_at();

alter table public.bootcamp_events enable row level security;
alter table public.registrations enable row level security;

-- Server-side Vercel API functions will use SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS.
-- Do not add public read policies for registrations; attendee data must stay private.

drop view if exists public.registration_event_summary;
create view public.registration_event_summary as
select
  e.id as event_id,
  e.title,
  e.starts_at,
  e.location,
  e.seat_limit,
  e.price_cents,
  e.currency,
  e.is_published,
  count(r.id) filter (where r.payment_status in ('paid', 'complete', 'completed'))::integer as paid_count,
  greatest(e.seat_limit - count(r.id) filter (where r.payment_status in ('paid', 'complete', 'completed'))::integer, 0) as seats_remaining,
  coalesce(sum(r.amount_total) filter (where r.payment_status in ('paid', 'complete', 'completed')), 0)::integer as revenue_cents
from public.bootcamp_events e
left join public.registrations r on r.event_id = e.id
group by e.id;
