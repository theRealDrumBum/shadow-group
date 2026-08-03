-- Roster invitations + long-term attendance stats.
--
-- The event tracker works in two layers:
--   1. Public: admins advertise where the team is deploying (public events).
--   2. Internal: when an event is staged, the whole roster is invited and each
--      member RSVPs going / not going / maybe. Admins later record who actually
--      attended, which builds a durable, per-member attendance history.
--
-- This migration adds the "invited" (awaiting response) RSVP state so we can
-- distinguish "hasn't answered yet" from "said no", tracks who invited the
-- roster and when, provides an atomic helper to invite every approved member,
-- and exposes a per-member attendance stats view for the long-term reporting.

-- 1. Allow an "invited" state and make it the default for roster invitations.
alter table public.event_rsvps
  drop constraint if exists event_rsvps_status_check;

alter table public.event_rsvps
  add constraint event_rsvps_status_check
  check (status in ('invited', 'going', 'not_going', 'maybe'));

alter table public.event_rsvps
  alter column status set default 'invited';

-- 2. Track how a member ended up on the invite list.
alter table public.event_rsvps
  add column if not exists invited_at timestamptz,
  add column if not exists invited_by uuid references public.profiles(id) on delete set null;

-- 3. Atomically invite the whole active roster to an event.
--
-- Called by the admin API through the service role (which bypasses RLS). Every
-- approved account gets an "invited" row; members who already have an RSVP are
-- left untouched, so it is safe to re-run as the roster grows. Returns the
-- number of members newly invited.
create or replace function public.invite_roster_to_event(
  p_event_id uuid,
  p_invited_by uuid default null
)
returns integer
language plpgsql
as $$
declare
  invited_count integer;
begin
  insert into public.event_rsvps (event_id, profile_id, status, invited_at, invited_by)
  select p_event_id, p.id, 'invited', now(), p_invited_by
  from public.profiles p
  where p.account_status = 'approved'
  on conflict (event_id, profile_id) do nothing;

  get diagnostics invited_count = row_count;
  return invited_count;
end;
$$;

-- 4. Per-member attendance history for long-term stats.
--
-- security_invoker keeps the underlying RLS in force: admins (who can read all
-- profiles) see every member; a regular member only sees their own row. Server
-- reporting uses the service role, which bypasses RLS and sees everyone.
create or replace view public.member_attendance_stats
with (security_invoker = on) as
select
  p.id as profile_id,
  p.display_name,
  p.email,
  p.operator_id,
  count(r.id) as invitations,
  count(*) filter (where r.status = 'going') as going,
  count(*) filter (where r.status = 'maybe') as maybe,
  count(*) filter (where r.status = 'not_going') as not_going,
  count(*) filter (where r.status = 'invited') as awaiting_response,
  count(*) filter (where r.status <> 'invited') as responses,
  count(*) filter (where r.attended is true) as attended,
  count(*) filter (where r.status = 'going' and r.attended is false) as no_shows
from public.profiles p
left join public.event_rsvps r on r.profile_id = p.id
group by p.id, p.display_name, p.email, p.operator_id;

grant select on public.member_attendance_stats to authenticated, service_role;
