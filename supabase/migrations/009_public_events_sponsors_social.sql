-- Production-facing event, sponsor, and social metadata.

alter table public.events
  add column if not exists end_date date,
  add column if not exists organizer text,
  add column if not exists event_url text,
  add column if not exists ticket_url text,
  add column if not exists venue_name text,
  add column if not exists attendance_status text not null default 'attending'
    check (attendance_status in ('interested','attending','confirmed','completed','cancelled')),
  add column if not exists is_featured boolean not null default false,
  add column if not exists attribution_source text not null default 'shadow-group',
  add column if not exists attribution_medium text not null default 'team-site',
  add column if not exists attribution_campaign text;

create index if not exists events_public_date_idx
  on public.events(is_public, event_date, display_order);

alter table public.brands
  add column if not exists partnership_level text,
  add column if not exists partner_since date,
  add column if not exists display_order integer not null default 0,
  add column if not exists featured boolean not null default false;

create table if not exists public.team_social_links (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  label text,
  url text not null,
  handle text,
  display_order integer not null default 0,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.team_social_links enable row level security;

create policy "public team social links are visible"
  on public.team_social_links for select
  using (is_public = true);

create policy "admins manage events"
  on public.events for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins manage brands"
  on public.brands for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins manage team social links"
  on public.team_social_links for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Seed known team positioning. URLs can be added or corrected from the admin UI.
insert into public.events (
  slug, name, organizer, venue_name, location, summary, description,
  attendance_status, is_featured, is_public, attribution_campaign
)
values (
  'd4-airsoft-home-field',
  'D4 Airsoft',
  'D4 Airsoft',
  'D4 Airsoft',
  'Central Texas',
  'One of Shadow Group''s home fields for team play and training.',
  'Shadow Group regularly trains and plays at D4 Airsoft. Individual game days can be added as dated events.',
  'confirmed',
  true,
  true,
  'd4-airsoft'
)
on conflict (slug) do update set
  summary = excluded.summary,
  description = excluded.description,
  is_featured = true,
  is_public = true,
  updated_at = now();
