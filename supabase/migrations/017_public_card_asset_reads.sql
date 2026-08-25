-- Public gallery reads complete_cards with the anon key. Card data was visible,
-- but card_assets had no SELECT policy, so image_path was always null and the
-- UI fell back to the site logo instead of the stored Magic card.
--
-- Storage objects in the public `card-assets` bucket were already readable;
-- the missing piece was the table row that holds the path.

drop policy if exists "assets of visible cards are public" on public.card_assets;
create policy "assets of visible cards are public"
  on public.card_assets
  for select
  using (
    exists (
      select 1
      from public.card_versions v
      join public.cards c on c.id = v.card_id
      where v.id = card_assets.card_version_id
        and (c.status = 'approved' or auth.uid() is not null)
    )
  );

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
  ca.storage_path as image_path,
  ca.kind as image_kind
from public.cards c
join public.operators o on o.id = c.operator_id
join public.card_versions v on v.id = c.canonical_version_id
left join public.expansions e on e.id = c.expansion_id
left join lateral (
  select a.storage_path, a.kind
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
