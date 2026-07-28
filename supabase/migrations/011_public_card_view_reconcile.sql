-- Reconcile the public card view so the Card Gallery, the GPT lookup endpoint,
-- and the random-card endpoint all read the same approved canonical data.
--
-- Migration 002 exposed sync_key/status/version_id but joined current_version_id
-- (the latest working revision, which may be an unapproved proposal).
-- Migration 004 correctly switched to canonical_version_id but dropped sync_key,
-- version_id, status and never exposed an artwork path.
--
-- This migration restores those columns, keeps the canonical (approved-only)
-- join, and surfaces the canonical version's primary artwork path so the app can
-- build a public URL from the public `card-assets` storage bucket.

drop view if exists public.complete_cards;

create view public.complete_cards as
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
  v.created_at as version_created_at,
  ca.storage_path as image_path
from public.cards c
join public.operators o on o.id = c.operator_id
join public.card_versions v on v.id = c.canonical_version_id
left join public.expansions e on e.id = c.expansion_id
left join lateral (
  select a.storage_path
  from public.card_assets a
  where a.card_version_id = v.id
    and a.kind in ('render', 'artwork', 'thumbnail', 'alternate')
  order by case a.kind
    when 'render' then 1
    when 'artwork' then 2
    when 'thumbnail' then 3
    else 4
  end, a.created_at desc
  limit 1
) ca on true
where c.status = 'approved'
  and v.status = 'approved';

grant select on public.complete_cards to anon, authenticated;
