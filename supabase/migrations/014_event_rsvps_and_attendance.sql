-- Event coordination: RSVPs, attendance history, and event notes.
--
-- Members RSVP (going / not going / maybe). Administrators later mark who
-- actually attended, which gives historical attendance and "said they'd come but
-- didn't show" (no-show) insight on the roster.

alter table public.events
  add column if not exists source_url text,   -- the pasted link an admin imported from
  add column if not exists notes text;        -- internal notes gathered around an event

create table if not exists public.event_rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'going' check (status in ('going', 'not_going', 'maybe')),
  note text,
  -- attended is admin-controlled: null = unknown, true = showed, false = no-show.
  attended boolean,
  responded_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, profile_id)
);

create index if not exists event_rsvps_event_idx on public.event_rsvps(event_id);
create index if not exists event_rsvps_profile_idx on public.event_rsvps(profile_id);

alter table public.event_rsvps enable row level security;

-- Any signed-in member can see who is attending (coordination). Member writes go
-- through the server API (service role), which only ever sets status/note for the
-- current user, so members cannot mark their own attendance.
create policy "authenticated members read rsvps"
  on public.event_rsvps for select to authenticated
  using (true);

create policy "admins manage rsvps"
  on public.event_rsvps for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
