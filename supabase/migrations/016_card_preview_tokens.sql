-- Shareable preview links for unpublished card versions.
-- Each version gets an unguessable token so the Cardsmith GPT can show a
-- visual preview without publishing the card to the public gallery.

alter table public.card_versions
  add column if not exists preview_token uuid not null default gen_random_uuid();

create unique index if not exists card_versions_preview_token_key
  on public.card_versions (preview_token);

-- Public card art is served from the public `card-assets` bucket. An explicit
-- select policy keeps those objects readable even if bucket flags drift.
drop policy if exists "card assets are publicly readable" on storage.objects;
create policy "card assets are publicly readable"
  on storage.objects for select
  using (bucket_id = 'card-assets');
