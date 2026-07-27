-- Version-level approval workflow.
-- A card is the permanent identity; each card version is reviewed independently.

create type public.version_status as enum (
  'draft',
  'generating',
  'submitted',
  'changes_requested',
  'approved',
  'rejected',
  'archived'
);

alter table public.card_versions
  add column status public.version_status not null default 'draft',
  add column submitted_at timestamptz,
  add column reviewed_at timestamptz,
  add column reviewed_by uuid references public.profiles(id),
  add column review_notes text;

-- The version currently displayed publicly. This changes only after approval.
alter table public.cards
  add column canonical_version_id uuid references public.card_versions(id) on delete set null;

create table public.card_version_review_events (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards(id) on delete cascade,
  card_version_id uuid not null references public.card_versions(id) on delete cascade,
  from_status public.version_status,
  to_status public.version_status not null,
  notes text,
  reviewed_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.card_version_review_events enable row level security;

create policy "admins can read version review events"
on public.card_version_review_events for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

create policy "admins can create version review events"
on public.card_version_review_events for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

-- Existing approved cards retain their currently selected version as canon.
update public.card_versions v
set status = 'approved',
    reviewed_at = coalesce(v.created_at, now())
from public.cards c
where c.current_version_id = v.id
  and c.status = 'approved';

update public.cards
set canonical_version_id = current_version_id
where status = 'approved' and current_version_id is not null;

-- PostgreSQL cannot remove or reorder columns through CREATE OR REPLACE VIEW.
-- Drop the prior 002_card_sync definition before creating the canonical-only view.
drop view if exists public.complete_cards;

-- Public consumers see only cards that have an approved canonical version.
create view public.complete_cards as
select
  c.id,
  c.slug,
  c.name,
  c.collector_number,
  c.published_at,
  c.expansion_id,
  c.operator_id,
  c.canonical_version_id,
  o.callsign,
  o.slug as operator_slug,
  o.team_role,
  e.code as expansion_code,
  e.name as expansion_name,
  v.version_number,
  v.mana_cost,
  v.color_identity,
  v.type_line,
  v.rules_text,
  v.flavor_text,
  v.power,
  v.toughness,
  v.rarity,
  v.facts_snapshot,
  v.art_prompt,
  v.renderer_data
from public.cards c
join public.operators o on o.id = c.operator_id
left join public.expansions e on e.id = c.expansion_id
join public.card_versions v on v.id = c.canonical_version_id
where v.status = 'approved';

grant select on public.complete_cards to anon, authenticated;
