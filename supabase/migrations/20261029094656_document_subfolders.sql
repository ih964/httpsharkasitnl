alter table public.document_folders add column parent_id uuid references public.document_folders(id) on delete restrict;
alter table public.document_folders drop constraint document_folders_name_key;
create unique index document_folders_sibling_name on public.document_folders(coalesce(parent_id,'00000000-0000-0000-0000-000000000000'::uuid),name);
create index document_folders_parent_idx on public.document_folders(parent_id);
alter table public.document_folders add constraint document_folders_valid_name check(name=trim(name) and name not in ('.','..') and position('/' in name)=0 and position(chr(92) in name)=0);
create function public.check_document_folder_parent() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 -- Serialize hierarchy mutations to prevent concurrent reciprocal parent changes.
 perform pg_catalog.pg_advisory_xact_lock(728401291);
 if new.parent_id is not null and exists(
  with recursive ancestors as (
   select id,parent_id from public.document_folders where id=new.parent_id
   union
   select f.id,f.parent_id from public.document_folders f join ancestors a on f.id=a.parent_id
  ) select 1 from ancestors where id=new.id
 ) then raise exception 'Een map kan niet onder zichzelf worden geplaatst.'; end if;
 return new;
end;
$$;
revoke execute on function public.check_document_folder_parent() from public,anon,authenticated;
create trigger document_folder_parent_check before insert or update of parent_id on public.document_folders for each row execute function public.check_document_folder_parent();
create unique index documents_active_folder_name on public.documents(coalesce(folder_id,'00000000-0000-0000-0000-000000000000'::uuid),name) where deleted_at is null;
insert into public.document_folders(name) values ('Klanten'),('Opdrachten'),('Administratie'),('Bedrijfsvoering'),('Marketing'),('Eigen projecten'),('Handelsactiviteiten'),('Archief') on conflict do nothing;
