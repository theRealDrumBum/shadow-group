-- Team platform schema. Enum values were committed in migration 005.
alter table public.profiles alter column role set default 'pending';
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists last_sign_in_at timestamptz;

alter table public.operators add column if not exists rank text;
alter table public.operators add column if not exists short_bio text;
alter table public.operators add column if not exists long_bio text;
alter table public.operators add column if not exists portrait_url text;
alter table public.operators add column if not exists banner_url text;
alter table public.operators add column if not exists display_order integer not null default 0;
alter table public.operators add column if not exists is_public boolean not null default false;
alter table public.operators add column if not exists is_featured boolean not null default false;
alter table public.operators add column if not exists joined_at date;

create table if not exists public.operator_social_links (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references public.operators(id) on delete cascade,
  platform text not null,
  label text,
  url text not null,
  display_order integer not null default 0,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  website_url text,
  logo_url text,
  description text,
  is_sponsor boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gear_catalog (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references public.brands(id) on delete set null,
  slug text not null unique,
  name text not null,
  category text not null,
  model text,
  image_url text,
  product_url text,
  affiliate_url text,
  affiliate_network text,
  affiliate_campaign text,
  affiliate_code text,
  sponsor_note text,
  disclosure_text text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.operator_loadout_items (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references public.operators(id) on delete cascade,
  gear_id uuid references public.gear_catalog(id) on delete set null,
  custom_name text,
  category text not null,
  loadout_group text,
  notes text,
  custom_product_url text,
  custom_affiliate_url text,
  is_sponsored boolean not null default false,
  sponsor_label text,
  display_order integer not null default 0,
  is_public boolean not null default true,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (gear_id is not null or custom_name is not null)
);

create index if not exists operator_loadout_operator_order_idx
  on public.operator_loadout_items(operator_id, display_order);
create index if not exists gear_catalog_category_idx
  on public.gear_catalog(category);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  event_date date,
  location text,
  summary text,
  description text,
  cover_image_url text,
  display_order integer not null default 0,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_media (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  media_type text not null check (media_type in ('image','video')),
  media_url text not null,
  thumbnail_url text,
  caption text,
  credit text,
  display_order integer not null default 0,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.recruitment_submissions (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  callsign text,
  location text,
  age integer,
  experience text,
  why_join text,
  social_links jsonb not null default '{}',
  status text not null default 'new' check (status in ('new','reviewing','contacted','accepted','rejected','withdrawn')),
  assigned_to uuid references public.profiles(id),
  internal_notes text,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sponsorship_inquiries (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text not null,
  email text not null,
  phone text,
  website_url text,
  proposal text,
  budget_range text,
  requested_activations text[],
  status text not null default 'new' check (status in ('new','reviewing','contacted','negotiating','accepted','declined')),
  assigned_to uuid references public.profiles(id),
  internal_notes text,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.allowed_accounts (
  email text primary key,
  role public.member_role not null,
  operator_id uuid references public.operators(id) on delete set null,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.operator_social_links enable row level security;
alter table public.brands enable row level security;
alter table public.gear_catalog enable row level security;
alter table public.operator_loadout_items enable row level security;
alter table public.events enable row level security;
alter table public.event_media enable row level security;
alter table public.recruitment_submissions enable row level security;
alter table public.sponsorship_inquiries enable row level security;
alter table public.allowed_accounts enable row level security;

create policy "public social links are visible" on public.operator_social_links
for select using (is_public = true);
create policy "active brands are public" on public.brands
for select using (is_active = true);
create policy "active gear is public" on public.gear_catalog
for select using (is_active = true);
create policy "public loadout items are visible" on public.operator_loadout_items
for select using (is_public = true and exists (
  select 1 from public.operators o where o.id = operator_id and o.is_public = true
));
create policy "public events are visible" on public.events
for select using (is_public = true);
create policy "public event media is visible" on public.event_media
for select using (is_public = true and exists (
  select 1 from public.events e where e.id = event_id and e.is_public = true
));
create policy "anyone may submit recruitment inquiry" on public.recruitment_submissions
for insert with check (true);
create policy "anyone may submit sponsorship inquiry" on public.sponsorship_inquiries
for insert with check (true);

insert into storage.buckets (id, name, public)
values ('team-media', 'team-media', true)
on conflict do nothing;
