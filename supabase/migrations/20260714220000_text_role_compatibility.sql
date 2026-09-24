-- Harkas One Release 1: compatibility for projects using has_role(uuid, text)
-- The existing text role model remains the source of truth.
do $role_compatibility$
begin
  if to_regprocedure('public.has_role(uuid,text)') is null then
    raise exception 'Release 1 requires public.has_role(uuid,text)';
  end if;

  if to_regtype('public.app_role') is null then
    execute 'create domain public.app_role as text';
  end if;
end;
$role_compatibility$;

create or replace function public.has_role(
  uid uuid,
  role_name public.app_role
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(uid, role_name::text);
$$;

revoke all on function public.has_role(uuid, public.app_role) from public;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;