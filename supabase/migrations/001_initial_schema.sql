create extension if not exists "pgcrypto";

create type public.member_role as enum ('member', 'editor', 'admin');
create type public.card_status as enum ('draft', 'generating', 'review', 'changes_requested', 'approved', 'archived');
create type public.asset_kind as enum ('reference', 'artwork', 'render', 'thumbnail', 'alternate');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role public.member_role not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.operators (
  id uuid primary key default gen_random_uuid(),
  callsign text not null unique,
  slug text not null unique,
  display_name text,
  bio text,
  team_role text,
  active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.operator_facts (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references public.operators(id) on delete cascade,
  category text not null check (category in ('strength','weakness','personality','gear','appearance','quote','story','role','running_joke')),
  fact text not null,
  source text,
  approved boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references public.operators(id) on delete cascade,
  slug text not null unique,
  name text not null,
  status public.card_status not null default 'draft',
  current_version_id uuid,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  published_at timestamptz
);

create table public.card_versions (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards(id) on delete cascade,
  version_number integer not null,
  mana_cost text,
  color_identity text[] not null default '{}',
  type_line text not null,
  rules_text text[] not null default '{}',
  flavor_text text,
  power text,
  toughness text,
  rarity text,
  facts_snapshot jsonb not null default '{}',
  art_prompt text,
  renderer_data jsonb not null default '{}',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique(card_id, version_number)
);

alter table public.cards add constraint cards_current_version_fk foreign key (current_version_id) references public.card_versions(id) on delete set null;

create table public.card_assets (
  id uuid primary key default gen_random_uuid(),
  card_version_id uuid not null references public.card_versions(id) on delete cascade,
  kind public.asset_kind not null,
  storage_path text not null,
  mime_type text,
  width integer,
  height integer,
  metadata jsonb not null default '{}',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.generation_runs (
  id uuid primary key default gen_random_uuid(),
  card_version_id uuid not null references public.card_versions(id) on delete cascade,
  model text not null,
  input_data jsonb not null default '{}',
  art_prompt text,
  output_metadata jsonb not null default '{}',
  status text not null default 'pending',
  error text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.operators enable row level security;
alter table public.operator_facts enable row level security;
alter table public.cards enable row level security;
alter table public.card_versions enable row level security;
alter table public.card_assets enable row level security;
alter table public.generation_runs enable row level security;

create policy "approved cards are public" on public.cards for select using (status = 'approved' or auth.uid() is not null);
create policy "operators are public" on public.operators for select using (true);
create policy "versions of visible cards are public" on public.card_versions for select using (exists (select 1 from public.cards c where c.id = card_id and (c.status = 'approved' or auth.uid() is not null)));
create policy "authenticated members can read facts" on public.operator_facts for select using (auth.uid() is not null);
create policy "authenticated members can create facts" on public.operator_facts for insert with check (auth.uid() = created_by);
create policy "authenticated members can create cards" on public.cards for insert with check (auth.uid() = created_by);
create policy "authenticated members can create versions" on public.card_versions for insert with check (auth.uid() = created_by);
create policy "authenticated members can create assets" on public.card_assets for insert with check (auth.uid() = created_by);
create policy "authenticated members can create runs" on public.generation_runs for insert with check (auth.uid() = created_by);

insert into storage.buckets (id, name, public) values ('card-assets', 'card-assets', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('operator-references', 'operator-references', false) on conflict do nothing;
