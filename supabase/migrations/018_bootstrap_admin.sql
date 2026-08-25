-- Bootstrap the first Command administrator without a self-approve click.
--
-- Why this exists after 013:
--   013 already re-affirms matt.c.ward@gmail.com and heals allow-listed profiles,
--   but it only matches public.profiles.email. Hosted projects that never applied
--   013, or where Google stored a different email on auth.users than on profiles
--   (matt@foundryfractional.com vs matt.c.ward@gmail.com), stay stuck on
--   account_status = 'pending'. There is no other admin who can click Approve.
--
-- This migration is idempotent. After merge, apply it on hosted Supabase with
-- `supabase db push` (or paste into the SQL editor). Signing in again is enough;
-- Command must not require an Approve click to become admin.

-- 1. Allow-list the Gmail Google login and the Foundry identity (Cursor owner).
insert into public.allowed_accounts (email, role, operator_id, is_active, notes)
select
  v.email,
  'admin'::public.member_role,
  o.id,
  true,
  v.notes
from (
  values
    ('matt.c.ward@gmail.com'::text, 'Bootstrap administrator (Google login)'::text),
    ('matt@foundryfractional.com'::text, 'Foundry Fractional / SINS identity; heal if this Google login was used'::text)
) as v(email, notes)
left join lateral (
  select id from public.operators where lower(callsign) = 'sins' limit 1
) o on true
on conflict (email) do update
set role = 'admin',
    is_active = true,
    notes = excluded.notes,
    operator_id = coalesce(public.allowed_accounts.operator_id, excluded.operator_id),
    updated_at = now();

-- 2. Heal existing profile rows by profile email, auth.users email, or identity email.
update public.profiles p
set role = 'admin',
    account_status = 'approved',
    approved_at = coalesce(p.approved_at, now()),
    operator_id = coalesce(
      p.operator_id,
      (select a.operator_id from public.allowed_accounts a where lower(a.email) = 'matt.c.ward@gmail.com' limit 1)
    ),
    email = coalesce(p.email, u.email),
    updated_at = now()
from auth.users u
where p.id = u.id
  and (
    lower(coalesce(p.email, '')) in ('matt.c.ward@gmail.com', 'matt@foundryfractional.com')
    or lower(coalesce(u.email, '')) in ('matt.c.ward@gmail.com', 'matt@foundryfractional.com')
    or exists (
      select 1
      from auth.identities i
      where i.user_id = p.id
        and lower(coalesce(i.identity_data ->> 'email', '')) in (
          'matt.c.ward@gmail.com',
          'matt@foundryfractional.com'
        )
    )
  )
  and (p.account_status <> 'approved' or p.role is distinct from 'admin');

-- Also heal profiles that exist without a matching auth.users join (email-only).
update public.profiles p
set role = 'admin',
    account_status = 'approved',
    approved_at = coalesce(p.approved_at, now()),
    updated_at = now()
where lower(coalesce(p.email, '')) in ('matt.c.ward@gmail.com', 'matt@foundryfractional.com')
  and (p.account_status <> 'approved' or p.role is distinct from 'admin');

-- 3. Provisioning: first sign-in creates an approved admin; later sign-ins
--    force-heal the bootstrap emails even if they were left pending.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  approved_account public.allowed_accounts%rowtype;
  normalized_email text := lower(coalesce(new.email, new.raw_user_meta_data ->> 'email', ''));
  existing public.profiles%rowtype;
  is_bootstrap boolean := normalized_email in ('matt.c.ward@gmail.com', 'matt@foundryfractional.com');
begin
  select *
    into approved_account
    from public.allowed_accounts
   where lower(email) = normalized_email
     and is_active = true;

  if approved_account.email is null and is_bootstrap then
    insert into public.allowed_accounts (email, role, is_active, notes)
    values (normalized_email, 'admin', true, 'Bootstrap administrator')
    on conflict (email) do update
    set role = 'admin', is_active = true, updated_at = now()
    returning * into approved_account;
  end if;

  select * into existing from public.profiles where id = new.id;

  if existing.id is null then
    insert into public.profiles (
      id, display_name, email, avatar_url, last_sign_in_at,
      role, account_status, approved_at, operator_id
    )
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, normalized_email), '@', 1)),
      coalesce(new.email, normalized_email),
      new.raw_user_meta_data ->> 'avatar_url',
      new.last_sign_in_at,
      coalesce(approved_account.role, case when is_bootstrap then 'admin'::public.member_role else 'pending'::public.member_role end),
      case when approved_account.email is not null or is_bootstrap then 'approved' else 'pending' end,
      case when approved_account.email is not null or is_bootstrap then now() else null end,
      approved_account.operator_id
    );
  else
    update public.profiles
    set display_name = coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', display_name),
        email = coalesce(new.email, email),
        avatar_url = coalesce(new.raw_user_meta_data ->> 'avatar_url', avatar_url),
        last_sign_in_at = new.last_sign_in_at,
        updated_at = now()
    where id = new.id;

    -- Bootstrap emails: always admin + approved. Other allow-listed accounts
    -- are only healed while still pending so later admin role edits stick.
    if is_bootstrap or (approved_account.email is not null and existing.account_status = 'pending') then
      update public.profiles
      set role = coalesce(approved_account.role, 'admin'::public.member_role),
          account_status = 'approved',
          approved_at = coalesce(existing.approved_at, now()),
          operator_id = coalesce(existing.operator_id, approved_account.operator_id),
          updated_at = now()
      where id = new.id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update on auth.users
  for each row execute procedure public.handle_new_auth_user();
