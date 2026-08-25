-- Unstick the bootstrap Google login without a self-approve click.
--
-- 018 already ran on hosted and still left matt.c.ward@gmail.com pending because:
--   1. It only UPDATEd existing profile rows (never INSERTed a missing profile
--      for the signed-in auth user).
--   2. Matching used exact lower(email), so Gmail dot/+ aliases and identity
--      emails did not match the allow-list.
--   3. profiles_email_lower_unique can block creating the real user's profile
--      when an older row already holds that email.
--   4. /command read profiles through RLS and treated a missing row as pending.
--
-- This migration inserts/heals the auth user, frees colliding emails, matches
-- Gmail-canonical addresses, and grants profile reads. Command also promotes
-- the account in application code via the service role so a page load is enough.

create or replace function public.canonical_email(raw text)
returns text
language sql
immutable
as $$
  select case
    when raw is null or btrim(raw) = '' then ''
    when split_part(lower(btrim(raw)), '@', 2) in ('gmail.com', 'googlemail.com') then
      replace(split_part(split_part(lower(btrim(raw)), '@', 1), '+', 1), '.', '') || '@gmail.com'
    else lower(btrim(raw))
  end
$$;

grant execute on function public.canonical_email(text) to anon, authenticated, service_role;

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
    ('matt@foundryfractional.com'::text, 'Foundry Fractional / SINS identity'::text)
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

-- Free the bootstrap mailbox off any profile that is not the live auth user.
update public.profiles p
set email = null,
    updated_at = now()
where public.canonical_email(p.email) in (
    public.canonical_email('matt.c.ward@gmail.com'),
    public.canonical_email('matt@foundryfractional.com')
  )
  and p.id not in (
    select u.id
    from auth.users u
    where public.canonical_email(coalesce(u.email, u.raw_user_meta_data ->> 'email')) in (
        public.canonical_email('matt.c.ward@gmail.com'),
        public.canonical_email('matt@foundryfractional.com')
      )
    union
    select i.user_id
    from auth.identities i
    where public.canonical_email(i.identity_data ->> 'email') in (
        public.canonical_email('matt.c.ward@gmail.com'),
        public.canonical_email('matt@foundryfractional.com')
      )
  );

insert into public.profiles (
  id, display_name, email, avatar_url, last_sign_in_at,
  role, account_status, approved_at, operator_id
)
select
  u.id,
  coalesce(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name',
    split_part(coalesce(u.email, ''), '@', 1),
    'Operator'
  ),
  coalesce(u.email, u.raw_user_meta_data ->> 'email'),
  u.raw_user_meta_data ->> 'avatar_url',
  u.last_sign_in_at,
  'admin'::public.member_role,
  'approved',
  now(),
  (
    select a.operator_id
    from public.allowed_accounts a
    where public.canonical_email(a.email) in (
      public.canonical_email(u.email),
      public.canonical_email('matt.c.ward@gmail.com')
    )
    limit 1
  )
from auth.users u
where public.canonical_email(coalesce(u.email, u.raw_user_meta_data ->> 'email')) in (
    public.canonical_email('matt.c.ward@gmail.com'),
    public.canonical_email('matt@foundryfractional.com')
  )
   or exists (
     select 1
     from auth.identities i
     where i.user_id = u.id
       and public.canonical_email(i.identity_data ->> 'email') in (
         public.canonical_email('matt.c.ward@gmail.com'),
         public.canonical_email('matt@foundryfractional.com')
       )
   )
on conflict (id) do update
set role = 'admin',
    account_status = 'approved',
    approved_at = coalesce(public.profiles.approved_at, now()),
    email = coalesce(excluded.email, public.profiles.email),
    operator_id = coalesce(public.profiles.operator_id, excluded.operator_id),
    updated_at = now();

update public.profiles p
set role = 'admin',
    account_status = 'approved',
    approved_at = coalesce(p.approved_at, now()),
    updated_at = now()
where public.canonical_email(p.email) in (
    public.canonical_email('matt.c.ward@gmail.com'),
    public.canonical_email('matt@foundryfractional.com')
  )
  and (p.account_status <> 'approved' or p.role is distinct from 'admin');

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  approved_account public.allowed_accounts%rowtype;
  normalized_email text := public.canonical_email(
    coalesce(new.email, new.raw_user_meta_data ->> 'email', '')
  );
  existing public.profiles%rowtype;
  is_bootstrap boolean := normalized_email in (
    public.canonical_email('matt.c.ward@gmail.com'),
    public.canonical_email('matt@foundryfractional.com')
  );
begin
  if not is_bootstrap then
    select exists (
      select 1
      from auth.identities i
      where i.user_id = new.id
        and public.canonical_email(i.identity_data ->> 'email') in (
          public.canonical_email('matt.c.ward@gmail.com'),
          public.canonical_email('matt@foundryfractional.com')
        )
    ) into is_bootstrap;
  end if;

  select *
    into approved_account
    from public.allowed_accounts
   where public.canonical_email(email) = normalized_email
     and is_active = true
   order by case when role = 'admin' then 0 else 1 end
   limit 1;

  if approved_account.email is null and is_bootstrap and normalized_email <> '' then
    insert into public.allowed_accounts (email, role, is_active, notes)
    values (coalesce(new.email, normalized_email), 'admin', true, 'Bootstrap administrator')
    on conflict (email) do update
    set role = 'admin', is_active = true, updated_at = now()
    returning * into approved_account;
  end if;

  if (approved_account.email is not null or is_bootstrap) and coalesce(new.email, '') <> '' then
    update public.profiles
    set email = null, updated_at = now()
    where id is distinct from new.id
      and public.canonical_email(email) = public.canonical_email(new.email);
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

grant select, insert, update on table public.profiles to authenticated, service_role;
grant select on table public.allowed_accounts to authenticated, service_role;
