create table public.document_folders (
 id uuid primary key default gen_random_uuid(),
 name text not null check (length(trim(name)) between 1 and 160),
 created_at timestamptz not null default now(),
 unique(name)
);
create table public.documents (
 id uuid primary key default gen_random_uuid(),
 name text not null check (length(trim(name)) between 1 and 240),
 folder_id uuid references public.document_folders(id) on delete restrict,
 customer_id uuid references public.customers(id) on delete set null,
 deleted_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table public.document_versions (
 id uuid primary key default gen_random_uuid(),
 document_id uuid not null references public.documents(id) on delete restrict,
 version integer not null check(version>0),
 storage_path text not null unique,
 mime_type text not null,
 size_bytes bigint not null check(size_bytes between 0 and 52428800),
 created_by uuid not null default auth.uid(),
 created_at timestamptz not null default now(),
 unique(document_id,version)
);
create index documents_folder_idx on public.documents(folder_id);
create index documents_customer_idx on public.documents(customer_id);
create index document_versions_document_idx on public.document_versions(document_id);
alter table public.document_folders enable row level security;
alter table public.documents enable row level security;
alter table public.document_versions enable row level security;
create policy document_folders_admin on public.document_folders for all to authenticated using(public.has_role((select auth.uid()),'admin'::text)) with check(public.has_role((select auth.uid()),'admin'::text));
create policy documents_admin on public.documents for all to authenticated using(public.has_role((select auth.uid()),'admin'::text)) with check(public.has_role((select auth.uid()),'admin'::text));
create policy document_versions_read on public.document_versions for select to authenticated using(public.has_role((select auth.uid()),'admin'::text));
create policy document_versions_insert on public.document_versions for insert to authenticated with check(public.has_role((select auth.uid()),'admin'::text) and created_by=(select auth.uid()));
revoke all on public.documents,public.document_folders,public.document_versions from anon,authenticated;
grant select,insert,update on public.documents,public.document_folders to authenticated;
grant select,insert on public.document_versions to authenticated;
insert into storage.buckets(id,name,public,file_size_limit) values('admin-documents','admin-documents',false,52428800);
create policy admin_documents_read on storage.objects for select to authenticated using(bucket_id='admin-documents' and public.has_role((select auth.uid()),'admin'::text));
create policy admin_documents_upload on storage.objects for insert to authenticated with check(bucket_id='admin-documents' and public.has_role((select auth.uid()),'admin'::text));
-- Every saved revision uses a new object. No client overwrite or permanent delete policy.
create function public.save_document_version(p_document_id uuid,p_name text,p_folder_id uuid,p_customer_id uuid,p_storage_path text,p_mime_type text,p_size_bytes bigint,p_expected_version integer default 0)
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_id uuid; v_current integer;
begin
 if not coalesce(public.has_role(auth.uid(),'admin'::text),false) then raise exception 'Geen toegang' using errcode='42501'; end if;
 if not exists(select 1 from storage.objects where bucket_id='admin-documents' and name=p_storage_path) then raise exception 'Upload ontbreekt'; end if;
 if p_document_id is null then
  insert into public.documents(name,folder_id,customer_id) values(p_name,p_folder_id,p_customer_id) returning id into v_id;
 else
  select id into v_id from public.documents where id=p_document_id and deleted_at is null for update;
  if v_id is null then raise exception 'Document niet gevonden'; end if;
 end if;
 select coalesce(max(version),0) into v_current from public.document_versions where document_id=v_id;
 if v_current<>p_expected_version then raise exception 'Er is een nieuwere versie. Sluit dit venster en open het document opnieuw.'; end if;
 insert into public.document_versions(document_id,version,storage_path,mime_type,size_bytes) values(v_id,v_current+1,p_storage_path,p_mime_type,p_size_bytes);
 update public.documents set updated_at=now() where id=v_id;
 return v_id;
end;
$$;
revoke all on function public.save_document_version(uuid,text,uuid,uuid,text,text,bigint,integer) from public,anon;
grant execute on function public.save_document_version(uuid,text,uuid,uuid,text,text,bigint,integer) to authenticated;
