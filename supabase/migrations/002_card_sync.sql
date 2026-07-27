create table if not exists public.expansions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  symbol_path text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cards
  add column if not exists expansion_id uuid references public.expansions(id) on delete set null,
  add column if not exists sync_key text,
  add column if not exists collector_number text;

create unique index if not exists cards_sync_key_unique
  on public.cards(sync_key)
  where sync_key is not null;

create unique index if not exists operator_fact_dedupe
  on public.operator_facts(operator_id, category, fact);

alter table public.expansions enable row level security;

create policy "expansions are public"
  on public.expansions
  for select
  using (true);

create or replace view public.complete_cards as
select
  c.id,
  c.slug,
  c.sync_key,
  c.name,
  c.status,
  c.collector_number,
  c.published_at,
  o.id as operator_id,
  o.callsign,
  o.slug as operator_slug,
  o.team_role,
  e.id as expansion_id,
  e.code as expansion_code,
  e.name as expansion_name,
  v.id as version_id,
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
  v.renderer_data,
  v.created_at as version_created_at
from public.cards c
join public.operators o on o.id = c.operator_id
join public.card_versions v on v.id = c.current_version_id
left join public.expansions e on e.id = c.expansion_id
where c.status = 'approved';

grant select on public.complete_cards to anon, authenticated;
