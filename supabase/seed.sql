-- Local development seed.
--
-- Hosted Supabase automatically grants the anon/authenticated/service_role
-- roles table + sequence privileges on the public schema via default
-- privileges. The local Supabase CLI migration flow does not, which leaves
-- server code that uses the service role key (e.g. /api/cards/*) unable to
-- read or write the tables created by the migrations. These grants mirror the
-- hosted defaults so local dev matches production. Row Level Security still
-- protects anon/authenticated access; service_role bypasses RLS by design.
grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public
  to anon, authenticated, service_role;
grant usage, select on all sequences in schema public
  to anon, authenticated, service_role;
grant execute on all functions in schema public
  to anon, authenticated, service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables
  to anon, authenticated, service_role;
alter default privileges in schema public
  grant usage, select on sequences
  to anon, authenticated, service_role;
