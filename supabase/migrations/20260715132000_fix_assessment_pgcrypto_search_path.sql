-- Harkas One Release 1: ensure pgcrypto functions are visible to the public scan RPC

do $pgcrypto_search_path_fix$
declare
  v_pgcrypto_schema text;
begin
  select n.nspname
  into v_pgcrypto_schema
  from pg_extension e
  join pg_namespace n on n.oid = e.extnamespace
  where e.extname = 'pgcrypto';

  if v_pgcrypto_schema is null then
    raise exception 'pgcrypto extension is missing';
  end if;

  execute format(
    'alter function public.submit_it_quick_scan(uuid,text,text,text,text,text,text,integer,boolean,boolean,integer,text,jsonb,jsonb,jsonb) set search_path to public, %I',
    v_pgcrypto_schema
  );
end;
$pgcrypto_search_path_fix$;
