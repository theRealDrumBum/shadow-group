alter type public.card_status add value if not exists 'submitted';
alter type public.card_status add value if not exists 'rejected';

alter table public.cards
  add column if not exists submitted_at timestamptz,
  add column if not exists submitted_by uuid references public.profiles(id),
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references public.profiles(id),
  add column if not exists review_notes text;

create table if not exists public.card_review_events (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards(id) on delete cascade,
  from_status public.card_status,
  to_status public.card_status not null,
  notes text,
  actor_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.card_review_events enable row level security;

create policy "members can view review events"
  on public.card_review_events
  for select
  using (auth.uid() is not null);

create or replace function public.is_admin(user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = user_id and role = 'admin'
  );
$$;

grant execute on function public.is_admin(uuid) to authenticated;

create policy "admins can update cards"
  on public.cards
  for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins can insert review events"
  on public.card_review_events
  for insert
  with check (public.is_admin() and actor_id = auth.uid());
