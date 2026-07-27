-- Initial Shadow Group roster.
-- Public dossier fields live on operators. Contact details remain in an admin-only table.

alter table public.operators
  add column if not exists primary_role text,
  add column if not exists secondary_role text,
  add column if not exists roster_notes text;

create table if not exists public.operator_private_contacts (
  operator_id uuid primary key references public.operators(id) on delete cascade,
  email text,
  phone text,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.operator_private_contacts enable row level security;

create policy "admins manage private operator contacts"
  on public.operator_private_contacts
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Public operator records.
insert into public.operators (
  callsign, slug, display_name, team_role, primary_role, secondary_role,
  rank, joined_at, roster_notes, active, is_public, display_order
)
values
  ('Osiris', 'osiris', 'Asvy Sepulveda', 'Rifleman', 'Rifleman', null, 'Recruit', null, null, true, true, 10),
  ('Pig', 'pig', 'Ayden Helton', 'Rifleman', 'Rifleman', null, 'Squad Member', '2026-03-06', 'Patched 3/6/2026', true, true, 20),
  ('Smokey', 'smokey', 'Jon', null, null, null, 'Recruit', null, null, true, true, 30),
  ('Breacher', 'breacher', 'Laurence Dirkes', 'Rifleman', 'Rifleman', 'SSW', 'Command', '2025-12-06', 'Patched 12/6/2025', true, true, 40),
  ('Sasquatch', 'sasquatch', 'Mark Hetherington II', null, null, null, 'Recruit', null, null, true, true, 50),
  ('Sins', 'sins', 'Matthew Ward', 'Rifleman', 'Rifleman', 'Drone Pilot, Medic', 'Command', '2025-12-06', 'Patched 12/6/2025', true, true, 60),
  ('Sparky', 'sparky', 'Stephen Parks', 'Rifleman', 'Rifleman', null, 'Squad Member', '2025-12-06', 'Patched 12/6/2025', true, true, 70),
  ('Grim', 'grim', 'Steven Blake Jones', 'Rifleman', 'Rifleman', null, 'Command', '2025-12-06', 'Patched 12/6/2025', true, true, 80),
  ('Cleaning Rod', 'cleaning-rod', 'Brady Rene Mead', 'Rifleman', 'Rifleman', 'Medic', 'Squad Member', '2025-12-06', 'Patched 12/6/2025', true, true, 90),
  ('Tofu', 'tofu', 'Chad McCann', 'Sniper', 'Sniper', null, 'Squad Member', '2025-12-06', 'Patched 12/6/2025', true, true, 100),
  ('Blackjack', 'blackjack', 'Eric Suzow', 'Rifleman', 'Rifleman', null, 'Squad Member', '2025-12-06', 'Patched 12/6/2025', true, true, 110),
  ('Mushroom', 'mushroom', 'Jim Briggs', 'SSW', 'SSW', null, 'Squad Member', '2025-12-06', 'Patched 12/6/2025', true, true, 120),
  ('Stitch', 'stitch', 'Jonah Tulmau', null, null, null, 'Recruit', null, null, true, true, 130),
  ('Bustr', 'bustr', 'Joshua Helton', 'Rifleman', 'Rifleman', null, 'Command', '2025-12-06', 'Patched 12/6/2025', true, true, 140),
  ('Kill-o-watt', 'kill-o-watt', 'Triston Grandy', 'Rifleman', 'Rifleman', null, 'Squad Member', '2026-03-07', 'Patched 3/7/2026', true, true, 150),
  ('Ripper', 'ripper', 'Austin Adams', 'Rifleman', 'Rifleman', 'Medic', 'Command', '2025-12-06', 'Patched 12/6/2025', true, true, 160),
  ('Rattlesnack', 'rattlesnack', 'Jake Kinkade', 'DMR', 'DMR', null, 'Squad Member', '2025-12-06', 'Patched 12/6/2025', true, true, 170),
  ('Isaac', 'isaac-becerra', 'Isaac Becerra', 'Sniper', 'Sniper', null, 'Recruit', null, 'Callsign not yet assigned; using first name as a temporary roster label.', true, true, 180),
  ('Rollo', 'rollo', 'Laurence Dirkes JR', 'SSW', 'SSW', 'Rifleman', 'Squad Member', '2026-03-06', 'Patched 3/6/2026', true, true, 190)
on conflict (callsign) do update set
  slug = excluded.slug,
  display_name = excluded.display_name,
  team_role = excluded.team_role,
  primary_role = excluded.primary_role,
  secondary_role = excluded.secondary_role,
  rank = excluded.rank,
  joined_at = excluded.joined_at,
  roster_notes = excluded.roster_notes,
  active = excluded.active,
  is_public = excluded.is_public,
  display_order = excluded.display_order,
  updated_at = now();

-- Private contact records.
insert into public.operator_private_contacts (operator_id, email, phone, internal_notes)
select o.id, roster.email, roster.phone, roster.notes
from (
  values
    ('Osiris', 'asvy@utexas.edu', null, null),
    ('Pig', null, null, 'Patched 3/6/2026'),
    ('Smokey', 'jonwnine@gmail.com', null, null),
    ('Breacher', 'Laurence.dirkes@gmail.com', null, 'Patched 12/6/2025'),
    ('Sasquatch', 'markhetheringtonii@gmail.com', null, null),
    ('Sins', 'matt.c.ward@gmail.com', '206-480-8525', 'Patched 12/6/2025'),
    ('Sparky', 'Stevewparks@gmail.com', null, 'Patched 12/6/2025'),
    ('Grim', 'Stevenj91116@gmail.com', null, 'Patched 12/6/2025'),
    ('Cleaning Rod', 'mead_brady@yahoo.com', null, 'Patched 12/6/2025'),
    ('Tofu', null, null, 'Patched 12/6/2025'),
    ('Blackjack', 'esuzow@gmail.com', null, 'Patched 12/6/2025'),
    ('Mushroom', 'James.earl.briggs@gmail.com', null, 'Patched 12/6/2025'),
    ('Stitch', 'Jonahwtulmau@gmail.com', null, null),
    ('Bustr', '90.jmh1@gmail.com', '817-223-1254', 'Patched 12/6/2025'),
    ('Kill-o-watt', null, null, 'Patched 3/7/2026'),
    ('Ripper', 'austinadams240@gmail.com', null, 'Patched 12/6/2025'),
    ('Rattlesnack', 'Jakekinkade2@gmail.com', null, 'Patched 12/6/2025'),
    ('Isaac', 'bece2168@gmail.com', null, 'Callsign pending'),
    ('Rollo', null, null, 'Patched 3/6/2026')
) as roster(callsign, email, phone, notes)
join public.operators o on o.callsign = roster.callsign
on conflict (operator_id) do update set
  email = excluded.email,
  phone = excluded.phone,
  internal_notes = excluded.internal_notes,
  updated_at = now();

-- Seed Google-login allowlist. Recruits remain recruit; patched members and command are members.
insert into public.allowed_accounts (email, role, operator_id, is_active, notes)
select lower(contact.email),
       case
         when lower(contact.email) = 'matt.c.ward@gmail.com' then 'admin'::public.member_role
         when o.rank = 'Recruit' then 'recruit'::public.member_role
         else 'member'::public.member_role
       end,
       o.id,
       true,
       coalesce(o.rank, 'Roster member')
from public.operator_private_contacts contact
join public.operators o on o.id = contact.operator_id
where contact.email is not null
on conflict (email) do update set
  role = excluded.role,
  operator_id = excluded.operator_id,
  is_active = true,
  notes = excluded.notes,
  updated_at = now();
