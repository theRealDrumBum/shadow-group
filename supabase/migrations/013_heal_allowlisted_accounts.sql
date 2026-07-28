-- Fix: allow-listed accounts (e.g. the bootstrap admin) get stuck on
-- account_status = 'pending'.
--
-- Root cause: handle_new_auth_user() only runs AFTER INSERT on auth.users and its
-- ON CONFLICT branch never (re)applies role/account_status. Any profile created
-- before the allow-list/trigger existed therefore never becomes approved, no
-- matter how many times the user signs in again.
--
-- This migration:
--   1. Re-affirms the bootstrap admin in allowed_accounts.
--   2. Backfills every existing profile from allowed_accounts (heals pending).
--   3. Rewrites provisioning to heal pending allow-listed accounts on both
--      INSERT and UPDATE (i.e. on every sign-in) without clobbering roles that an
--      administrator has already set on an approved account.

-- 1. Ensure the bootstrap administrator is present and active.
insert into public.allowed_accounts (email, role, is_active, notes)
values ('matt.c.ward@gmail.com', 'admin', true, 'Bootstrap and sole administrator')
on conflict (email) do update
set role = 'admin', is_active = true, updated_at = now();

-- 2. Backfill: any profile whose email is on the active allow-list becomes
--    approved with the allow-listed role. This immediately unsticks accounts that
--    signed in before the allow-list/trigger existed.
update public.profiles p
set role = a.role,
    account_status = 'approved',
    approved_at = coalesce(p.approved_at, now()),
    operator_id = coalesce(p.operator_id, a.operator_id),
    updated_at = now()
from public.allowed_accounts a
where a.is_active = true
  and lower(p.email) = lower(a.email)
  and (p.account_status <> 'approved' or p.role is distinct from a.role);

-- 3. Provisioning function that also heals on sign-in.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  approved_account public.allowed_accounts%rowtype;
  normalized_email text := lower(coalesce(new.email, ''));
  existing public.profiles%rowtype;
begin
  select *
    into approved_account
    from public.allowed_accounts
   where lower(email) = normalized_email
     and is_active = true;

  select * into existing from public.profiles where id = new.id;

  if existing.id is null then
    -- First sign-in: create the profile from the allow-list (if present).
    insert into public.profiles (
      id, display_name, email, avatar_url, last_sign_in_at,
      role, account_status, approved_at, operator_id
    )
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
      new.email,
      new.raw_user_meta_data ->> 'avatar_url',
      new.last_sign_in_at,
      coalesce(approved_account.role, 'pending'::public.member_role),
      case when approved_account.email is not null then 'approved' else 'pending' end,
      case when approved_account.email is not null then now() else null end,
      approved_account.operator_id
    );
  else
    -- Returning user: always refresh identity fields.
    update public.profiles
    set display_name = coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', display_name),
        email = new.email,
        avatar_url = coalesce(new.raw_user_meta_data ->> 'avatar_url', avatar_url),
        last_sign_in_at = new.last_sign_in_at,
        updated_at = now()
    where id = new.id;

    -- Heal allow-listed accounts that are still pending. We only touch pending
    -- accounts so an administrator's later role changes are never overwritten.
    if approved_account.email is not null and existing.account_status = 'pending' then
      update public.profiles
      set role = approved_account.role,
          account_status = 'approved',
          approved_at = now(),
          operator_id = coalesce(existing.operator_id, approved_account.operator_id),
          updated_at = now()
      where id = new.id;
    end if;
  end if;

  return new;
end;
$$;

-- 4. Fire provisioning on sign-up and on every sign-in (last_sign_in_at update).
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update on auth.users
  for each row execute procedure public.handle_new_auth_user();
