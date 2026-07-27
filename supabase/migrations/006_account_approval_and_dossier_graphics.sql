-- Google authentication proves identity; Shadow Group approval grants access.
-- New sign-ins remain pending unless explicitly approved.

alter table public.profiles add column if not exists account_status text not null default 'pending'
  check (account_status in ('pending','approved','suspended','denied'));
alter table public.profiles add column if not exists approved_at timestamptz;
alter table public.profiles add column if not exists approved_by uuid references public.profiles(id) on delete set null;
alter table public.profiles add column if not exists operator_id uuid references public.operators(id) on delete set null;

create unique index if not exists profiles_email_lower_unique
  on public.profiles (lower(email)) where email is not null;

-- Matt is the bootstrap and sole administrator at this stage.
insert into public.allowed_accounts (email, role, is_active, notes)
values ('matt.c.ward@gmail.com', 'admin', true, 'Bootstrap and sole administrator')
on conflict (email) do update
set role = 'admin', is_active = true, notes = excluded.notes, updated_at = now();

delete from public.allowed_accounts
where role = 'admin' and lower(email) <> 'matt.c.ward@gmail.com';

update public.profiles
set role = 'pending',
    account_status = case when account_status = 'approved' then 'pending' else account_status end,
    approved_at = null,
    approved_by = null
where role = 'admin'
  and lower(coalesce(email, '')) <> 'matt.c.ward@gmail.com';

create table if not exists public.account_role_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  old_role public.member_role,
  new_role public.member_role not null,
  old_status text,
  new_status text not null,
  changed_by uuid references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.account_role_events enable row level security;

-- Operator dossier image configuration.
-- auto: portrait first, then approved card render fallback.
-- portrait: always use the normal portrait.
-- card: always use the selected approved card version render.
alter table public.operators add column if not exists dossier_graphic_mode text not null default 'auto'
  check (dossier_graphic_mode in ('auto','portrait','card'));
alter table public.operators add column if not exists dossier_card_id uuid references public.cards(id) on delete set null;
alter table public.operators add column if not exists dossier_card_version_id uuid references public.card_versions(id) on delete set null;

create or replace view public.public_operator_dossiers as
select
  o.*,
  case
    when o.dossier_graphic_mode = 'portrait' then o.portrait_url
    when o.dossier_graphic_mode = 'card' then ca.storage_path
    else coalesce(o.portrait_url, ca.storage_path)
  end as dossier_graphic_url,
  case
    when o.dossier_graphic_mode = 'portrait' then 'portrait'
    when o.dossier_graphic_mode = 'card' and ca.storage_path is not null then 'card'
    when o.portrait_url is not null then 'portrait'
    when ca.storage_path is not null then 'card'
    else 'none'
  end as dossier_graphic_source
from public.operators o
left join public.cards c on c.id = o.dossier_card_id
left join public.card_versions cv on cv.id = coalesce(o.dossier_card_version_id, c.canonical_version_id)
left join lateral (
  select a.storage_path
  from public.card_assets a
  where a.card_version_id = cv.id
    and a.kind in ('render','thumbnail','artwork')
  order by case a.kind when 'render' then 1 when 'thumbnail' then 2 else 3 end, a.created_at desc
  limit 1
) ca on true
where o.is_public = true;
