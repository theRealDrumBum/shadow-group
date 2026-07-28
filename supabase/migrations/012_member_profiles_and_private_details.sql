-- Member onboarding: secure private details + admin-approved public profiles.
--
-- Two distinct data classes:
--   1. Private details (contact, emergency contact, medical) — self-service,
--      never public, readable only by the member and administrators.
--   2. Public profile changes (bio, photos, roles) — submitted by the member and
--      applied to the public `operators` record only after admin approval.

-- ---------------------------------------------------------------------------
-- 1. Private, sensitive member details (secured by row-level security).
-- ---------------------------------------------------------------------------
create table if not exists public.member_private_details (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  legal_name text,
  phone text,
  email text,
  address text,
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relationship text,
  health_notes text,
  allergies text,
  medications text,
  blood_type text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.member_private_details enable row level security;

-- The member owns their record. This is intentionally NOT admin-only: each
-- member manages their own sensitive data.
create policy "members read their own private details"
  on public.member_private_details for select to authenticated
  using (profile_id = auth.uid());
create policy "members upsert their own private details"
  on public.member_private_details for insert to authenticated
  with check (profile_id = auth.uid());
create policy "members update their own private details"
  on public.member_private_details for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
create policy "members delete their own private details"
  on public.member_private_details for delete to authenticated
  using (profile_id = auth.uid());

-- Administrators can read emergency/medical info (needed at events) but this
-- data is never exposed publicly.
create policy "admins read member private details"
  on public.member_private_details for select to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 2. Public profile change submissions (admin approval before going live).
-- ---------------------------------------------------------------------------
create table if not exists public.member_profile_submissions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  operator_id uuid references public.operators(id) on delete set null,
  submission_type text not null default 'member'
    check (submission_type in ('member', 'recruit')),
  display_name text,
  callsign text,
  primary_role text,
  secondary_role text,
  short_bio text,
  bio text,
  portrait_url text,
  gallery_urls text[] not null default '{}',
  social_links jsonb not null default '{}',
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'changes_requested', 'rejected')),
  review_notes text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists member_profile_submissions_profile_idx
  on public.member_profile_submissions(profile_id, submitted_at desc);
create index if not exists member_profile_submissions_status_idx
  on public.member_profile_submissions(status, submitted_at);

alter table public.member_profile_submissions enable row level security;

-- Members can see their own submissions and their review outcome.
create policy "members read their own submissions"
  on public.member_profile_submissions for select to authenticated
  using (profile_id = auth.uid());
-- Members may only create/update submissions in the pending state. They can
-- never self-approve: the status is constrained to 'pending' on member writes.
create policy "members create pending submissions"
  on public.member_profile_submissions for insert to authenticated
  with check (profile_id = auth.uid() and status = 'pending');
create policy "members update their pending submissions"
  on public.member_profile_submissions for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid() and status = 'pending');

-- Administrators review, approve, request changes, or reject.
create policy "admins read all submissions"
  on public.member_profile_submissions for select to authenticated
  using (public.is_admin());
create policy "admins update submissions"
  on public.member_profile_submissions for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 3. Public roster gallery support (approved images live on the operator).
-- ---------------------------------------------------------------------------
alter table public.operators
  add column if not exists gallery_urls text[] not null default '{}';

-- ---------------------------------------------------------------------------
-- 4. Capture the same onboarding data for recruit applications.
--    recruitment_submissions has no public SELECT policy, so it stays private.
-- ---------------------------------------------------------------------------
alter table public.recruitment_submissions
  add column if not exists emergency_contact_name text,
  add column if not exists emergency_contact_phone text,
  add column if not exists emergency_contact_relationship text,
  add column if not exists health_notes text,
  add column if not exists allergies text,
  add column if not exists bio text,
  add column if not exists portrait_url text;

-- ---------------------------------------------------------------------------
-- 5. Storage bucket for member-provided imagery.
--    Uploads are namespaced per user folder (<uid>/...). Public read is fine
--    for profile photos (they are opt-in and only surfaced after approval).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('member-media', 'member-media', true)
on conflict do nothing;

create policy "members upload their own media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'member-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "members update their own media"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'member-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "members delete their own media"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'member-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "member media is publicly readable"
  on storage.objects for select
  using (bucket_id = 'member-media');
