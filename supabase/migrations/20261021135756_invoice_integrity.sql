-- Atomic editor saves and an explicit version prevent partial/lost updates.
alter table public.invoices add column if not exists edit_version integer not null default 1;

create or replace function public.guard_invoice_integrity() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  -- Trusted DR replay must preserve the source revision verbatim.
  if current_setting('harkas.dr_replay',true)='on' then return coalesce(new,old); end if;
  if exists(select 1 from public.quotes where invoice_id=old.id) then
    if tg_op='DELETE' then raise exception 'Deze factuur is gekoppeld aan een offerte en kan niet worden verwijderd.'; end if;
    if new.deleted_at is distinct from old.deleted_at and new.deleted_at is not null then
      raise exception 'Deze factuur is gekoppeld aan een offerte en kan niet worden verwijderd.';
    end if;
    if new.customer_id is distinct from old.customer_id or new.invoice_number is distinct from old.invoice_number then
      raise exception 'Klant en factuurnummer van een gekoppelde offerte kunnen niet worden gewijzigd.';
    end if;
  end if;
  if tg_op='UPDATE' then new.edit_version:=old.edit_version+1; new.updated_at:=now(); return new; end if;
  return old;
end; $$;
revoke all on function public.guard_invoice_integrity() from public,anon,authenticated;
create trigger invoice_integrity_guard before update or delete on public.invoices
  for each row execute function public.guard_invoice_integrity();

create or replace function public.generate_invoice_number(p_year integer) returns text
language plpgsql security definer set search_path=pg_catalog,public as $$
declare next_num integer;
begin
  if auth.uid() is null or not (public.has_role(auth.uid(),'admin'::text) or public.has_module(auth.uid(),'invoices') or public.has_module(auth.uid(),'domains') or public.has_module(auth.uid(),'time_entries')) then
    raise exception 'Geen toegang om factuurnummers te genereren' using errcode='42501';
  end if;
  if p_year is null or p_year not between 2000 and 2199 then raise exception 'Ongeldig factuurjaar'; end if;
  insert into public.invoice_counters(invoice_year,last_number) values(p_year,1)
    on conflict(invoice_year) do update set last_number=public.invoice_counters.last_number+1 returning last_number into next_num;
  return p_year||'-'||lpad(next_num::text,greatest(3,length(next_num::text)),'0');
end; $$;

create or replace function public.save_invoice(p_invoice jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare
  inv public.invoices; iid uuid; cid uuid; expected integer; d date; due date; state text;
  item jsonb; clean_items jsonb:='[]'::jsonb; qty numeric; price numeric; vat numeric;
  net numeric; tax numeric; sum_net numeric:=0; sum_tax numeric:=0;
  damaged boolean; damage numeric; number text; created boolean:=false;
begin
  if auth.uid() is null or not public.has_module(auth.uid(),'invoices') then raise exception 'Geen toegang tot Facturen' using errcode='42501'; end if;
  iid:=(p_invoice->>'id')::uuid; cid:=nullif(p_invoice->>'customer_id','')::uuid;
  expected:=(p_invoice->>'expected_version')::integer;
  d:=(p_invoice->>'invoice_date')::date; due:=nullif(p_invoice->>'due_date','')::date;
  state:=p_invoice->>'status'; damaged:=coalesce((p_invoice->>'has_damage')::boolean,false);
  damage:=case when damaged then coalesce((p_invoice->>'damage_amount')::numeric,0) else 0 end;
  if iid is null or expected is null or expected<0 or d is null or extract(year from d) not between 2000 and 2199
    or (due is not null and (due<d or extract(year from due) not between 2000 and 2199))
    or state is null or state not in ('concept','verzonden','betaald','vervallen')
    or length(coalesce(p_invoice->>'notes',''))>8000 or length(coalesce(p_invoice->>'damage_description',''))>2000
    or damage<0 or damage<>round(damage,2)
  then raise exception 'Controleer factuurdatum, vervaldatum, status, tekst en schadebedrag'; end if;
  if cid is not null and not exists(select 1 from public.customers where id=cid) then raise exception 'Klant bestaat niet meer'; end if;
  if jsonb_typeof(p_invoice->'items') is distinct from 'array' then raise exception 'Factuur bevat geen regels'; end if;
  if jsonb_array_length(p_invoice->'items') not between 1 and 200 then raise exception 'Gebruik 1 tot 200 factuurregels'; end if;
  for item in select value from jsonb_array_elements(p_invoice->'items') loop
    qty:=(item->>'quantity')::numeric; price:=(item->>'price')::numeric; vat:=(item->>'vat_percentage')::numeric;
    if length(trim(coalesce(item->>'description',''))) not between 1 and 2000 or qty is null or price is null or vat is null
      or qty not between 0.001 and 100000 or qty<>round(qty,3)
      or price not between 0 and 10000000 or price<>round(price,6)
      or vat not between 0 and 100 or vat<>round(vat,2)
    then raise exception 'Ongeldige factuurregel: controleer omschrijving, aantal, prijs en btw'; end if;
    net:=round(qty*price,2); tax:=round(net*vat/100,2); sum_net:=sum_net+net; sum_tax:=sum_tax+tax;
    clean_items:=clean_items||jsonb_build_array(jsonb_build_object('description',trim(item->>'description'),'quantity',qty,'price',price,'vat_percentage',vat,'subtotal',net));
  end loop;
  if damage>sum_net+sum_tax then raise exception 'Schadebedrag is hoger dan het factuurtotaal'; end if;
  perform pg_advisory_xact_lock(hashtextextended('invoice:'||iid::text,0));
  select * into inv from public.invoices where id=iid for update;
  if found then
    if expected=0 then raise exception 'Deze factuur is al opgeslagen. Vernieuw het overzicht en heropen de factuur.' using errcode='40001'; end if;
    if inv.deleted_at is not null then raise exception 'Deze factuur is verwijderd'; end if;
    if inv.edit_version<>expected then raise exception 'De factuur is elders gewijzigd. Heropen de factuur voordat je opslaat.' using errcode='40001'; end if;
    update public.invoices set customer_id=cid,invoice_date=d,due_date=due,status=state,invoice_year=extract(year from d)::integer,
      invoice_month=extract(month from d)::integer,notes=nullif(p_invoice->>'notes',''),subtotal=sum_net,vat_total=sum_tax,total=sum_net+sum_tax,
      has_damage=damaged,damage_amount=damage,damage_description=case when damaged then nullif(p_invoice->>'damage_description','') else null end,
      pdf_storage_path=case when source_type='uploaded' then pdf_storage_path else null end
      where id=iid returning * into inv;
    delete from public.invoice_items where invoice_id=iid;
  else
    if expected<>0 then raise exception 'Factuur niet gevonden'; end if;
    number:=public.generate_invoice_number(extract(year from d)::integer); created:=true;
    insert into public.invoices(id,invoice_number,customer_id,invoice_date,due_date,status,source_type,invoice_year,invoice_month,notes,subtotal,vat_total,total,has_damage,damage_amount,damage_description)
      values(iid,number,cid,d,due,state,'generated',extract(year from d)::integer,extract(month from d)::integer,nullif(p_invoice->>'notes',''),sum_net,sum_tax,sum_net+sum_tax,damaged,damage,case when damaged then nullif(p_invoice->>'damage_description','') else null end)
      returning * into inv;
  end if;
  insert into public.invoice_items(invoice_id,description,quantity,price,vat_percentage,subtotal)
    select iid,x.description,x.quantity,x.price,x.vat_percentage,x.subtotal
    from jsonb_to_recordset(clean_items) as x(description text,quantity numeric,price numeric,vat_percentage numeric,subtotal numeric);
  insert into public.activity_logs(type,reference_id,description) values(case when created then 'invoice_created' else 'invoice_updated' end,iid,'Factuur '||inv.invoice_number||case when created then ' aangemaakt' else ' bijgewerkt' end);
  return to_jsonb(inv);
end; $$;
revoke all on function public.save_invoice(jsonb),public.generate_invoice_number(integer) from public,anon;
grant execute on function public.save_invoice(jsonb),public.generate_invoice_number(integer) to authenticated;
notify pgrst,'reload schema';
