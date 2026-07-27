-- Enum values must be committed before later migrations can use them.
alter type public.member_role add value if not exists 'pending';
alter type public.member_role add value if not exists 'recruit';
alter type public.member_role add value if not exists 'alumni';
