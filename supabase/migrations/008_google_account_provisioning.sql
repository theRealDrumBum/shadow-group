-- Create and maintain a Shadow Group profile when Supabase Auth creates a user.
-- Authentication proves identity; allowed_accounts controls approval and role.

-- PostgreSQL identifies this function by name and argument types, and an earlier
-- migration created it with the input parameter name `user_id`. CREATE OR REPLACE
-- must preserve that parameter name.
create or replace function public.is_admin(user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = user_id
      and p.role = 'admin'
      and p.account_status = 'approved'
  );
$$;

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  approved_account public.allowed_accounts%rowtype;
  normalized_email text := lower(coalesce(new.email, ''));
begin
  select *
    into approved_account
    from public.allowed_accounts
   where lower(email) = normalized_email
     and is_active = true;

  insert into public.profiles (
    id,
    display_name,
    email,
    avatar_url,
    last_sign_in_at,
    role,
    account_status,
    approved_at,
    operator_id
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
  )
  on conflict (id) do update
  set display_name = excluded.display_name,
      email = excluded.email,
      avatar_url = excluded.avatar_url,
      last_sign_in_at = excluded.last_sign_in_at,
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

create policy "users can read their own profile"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_admin());

create policy "admins can update profiles"
on public.profiles for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admins can read allowed accounts"
on public.allowed_accounts for select
to authenticated
using (public.is_admin());

create policy "admins can manage allowed accounts"
on public.allowed_accounts for all
to authenticated
using (public.is_admin())
with check (public.is_admin());