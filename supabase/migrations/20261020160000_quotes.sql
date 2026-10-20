-- Offertes: additive schema, atomic saves, separate numbering and idempotent conversion.
create table if not exists public.quote_counters (
  quote_year integer primary key, last_number integer not null default 0 check(last_number >= 0)
);
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(), quote_number text not null unique,
  customer_id uuid not null references public.customers(id),
  title text not null, quote_date date not null, valid_until date not null,
  reference text not null default '', notes text not null default '', terms text not null default '',
  discount_percentage numeric(5,2) not null default 0 check(discount_percentage between 0 and 100),
  items jsonb not null check(jsonb_typeof(items)='array'),
  customer_snapshot jsonb not null, company_snapshot jsonb not null,
  subtotal numeric(18,2) not null, vat_total numeric(18,2) not null, total numeric(18,2) not null,
  status text not null default 'concept' check(status in ('concept','verzonden','geaccepteerd','afgewezen','verlopen','gefactureerd')),
  version integer not null default 1, invoice_id uuid unique references public.invoices(id), invoice_number text,
  created_by uuid not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(valid_until >= quote_date), check(total = subtotal + vat_total)
);
create index if not exists quotes_customer_idx on public.quotes(customer_id);
create index if not exists quotes_created_idx on public.quotes(created_at desc);
alter table public.quotes enable row level security;
alter table public.quote_counters enable row level security;
revoke all on public.quotes, public.quote_counters from anon, authenticated;
grant select on public.quotes to authenticated;
drop policy if exists quotes_read on public.quotes;
create policy quotes_read on public.quotes for select to authenticated
  using(auth.uid() is not null and public.has_module(auth.uid(),'quotes'));
-- Restrict mutations to the validated RPCs, never direct client updates to totals/status/counters.
alter table public.user_module_access drop constraint if exists user_module_access_module_key_check;
alter table public.user_module_access add constraint user_module_access_module_key_check check(module_key in (
  'dashboard','invoices','factuur_maker','customers','domains','time_entries','passwords',
  'tankprijzen','parkeren','btw_overzicht','settings','tickets','quotes'
));
drop policy if exists quotes_customer_lookup on public.customers;
create policy quotes_customer_lookup on public.customers for select to authenticated using(public.has_module(auth.uid(),'quotes'));
drop policy if exists quotes_branding_lookup on public.settings;
create policy quotes_branding_lookup on public.settings for select to authenticated using(public.has_module(auth.uid(),'quotes'));

create or replace function public.save_quote(p_quote jsonb) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  q public.quotes; cid uuid; qid uuid; n integer; yr integer; qdate date; until_date date;
  customer jsonb; company jsonb; clean_items jsonb := '[]'::jsonb; item jsonb;
  quantity numeric; price numeric; vat numeric; discount numeric; net numeric; tax numeric;
  sum_net numeric := 0; sum_tax numeric := 0; expected integer;
begin
  if auth.uid() is null or not public.has_module(auth.uid(),'quotes') then raise exception 'Geen toegang tot Offertes' using errcode='42501'; end if;
  qid := (p_quote->>'id')::uuid; cid := (p_quote->>'customer_id')::uuid;
  qdate := (p_quote->>'quote_date')::date; until_date := (p_quote->>'valid_until')::date;
  expected := (p_quote->>'version')::integer; discount := (p_quote->>'discount_percentage')::numeric;
  if qid is null or cid is null or expected is null or expected < 0 or qdate is null or until_date is null or until_date < qdate
     or extract(year from qdate) not between 2000 and 2199 or extract(year from until_date) not between 2000 and 2199
     or discount is null or discount not between 0 and 100 or discount <> round(discount,2)
     or length(trim(coalesce(p_quote->>'title',''))) not between 1 and 200
     or length(coalesce(p_quote->>'reference','')) > 200 or length(coalesce(p_quote->>'notes','')) > 4000
     or length(coalesce(p_quote->>'terms','')) > 8000
  then raise exception 'Controleer onderwerp, klant, datums, korting en tekstlengte'; end if;
  if jsonb_typeof(p_quote->'items') is distinct from 'array' then raise exception 'Offerte bevat geen regels'; end if;
  if jsonb_array_length(p_quote->'items') not between 1 and 200 then raise exception 'Gebruik 1 tot 200 offerteregels'; end if;
  perform pg_advisory_xact_lock(hashtextextended('quote:' || qid::text, 0));
  select * into q from public.quotes where id=qid for update;
  if found then
    if q.version <> expected then raise exception 'Offerte is elders gewijzigd. Heropen de offerte.' using errcode='40001'; end if;
    if q.status <> 'concept' then raise exception 'Alleen concepten zijn bewerkbaar. Dupliceer voor een nieuwe versie.'; end if;
  elsif expected <> 0 then raise exception 'Offerte niet gevonden';
  end if;
  select jsonb_build_object('name',name,'company_name',company_name,'email',email,'address',address,'postal_code',postal_code,'city',city,'kvk_number',kvk_number,'vat_number',vat_number)
    into customer from public.customers where id=cid;
  if customer is null then raise exception 'Klant bestaat niet meer'; end if;
  select jsonb_build_object('company_name',company_name,'address',address,'email','info@harkasit.nl','kvk',kvk,'vat_number',vat_number,'logo_url',logo_url)
    into company from public.settings limit 1;
  company := coalesce(company, jsonb_build_object('company_name','Harkas IT','email','info@harkasit.nl'));
  for item in select value from jsonb_array_elements(p_quote->'items') loop
    quantity := (item->>'quantity')::numeric; price := (item->>'price')::numeric; vat := (item->>'vat_percentage')::numeric;
    if length(trim(coalesce(item->>'description',''))) not between 1 and 2000 or quantity is null or price is null or vat is null
      or quantity not between 0.001 and 100000 or quantity <> round(quantity,3)
      or price not between 0 and 10000000 or price <> round(price,2) or vat not in (0,9,21)
    then raise exception 'Ongeldige regel: controleer omschrijving, aantal, prijs en btw'; end if;
    net := round(quantity * price * (100-discount) / 100, 2); tax := round(net * vat / 100, 2);
    sum_net := sum_net + net; sum_tax := sum_tax + tax;
    clean_items := clean_items || jsonb_build_array(jsonb_build_object('description',trim(item->>'description'),'quantity',quantity,'price',price,'vat_percentage',vat,'subtotal',net,'vat_total',tax));
  end loop;
  if q.id is null then
    yr := extract(year from qdate)::integer;
    insert into public.quote_counters(quote_year,last_number) values(yr,1)
      on conflict(quote_year) do update set last_number=public.quote_counters.last_number+1 returning last_number into n;
    insert into public.quotes(id,quote_number,customer_id,title,quote_date,valid_until,reference,notes,terms,discount_percentage,items,customer_snapshot,company_snapshot,subtotal,vat_total,total,created_by)
    values(qid,'OFF-'||yr||'-'||lpad(n::text,greatest(3,length(n::text)),'0'),cid,trim(p_quote->>'title'),qdate,until_date,coalesce(p_quote->>'reference',''),coalesce(p_quote->>'notes',''),coalesce(p_quote->>'terms',''),discount,clean_items,customer,company,sum_net,sum_tax,sum_net+sum_tax,auth.uid()) returning * into q;
  else
    update public.quotes set customer_id=cid,title=trim(p_quote->>'title'),quote_date=qdate,valid_until=until_date,
      reference=coalesce(p_quote->>'reference',''),notes=coalesce(p_quote->>'notes',''),terms=coalesce(p_quote->>'terms',''),discount_percentage=discount,
      items=clean_items,customer_snapshot=customer,company_snapshot=company,subtotal=sum_net,vat_total=sum_tax,total=sum_net+sum_tax,version=version+1,updated_at=now()
      where id=qid returning * into q;
  end if;
  return to_jsonb(q);
end; $$;

create or replace function public.set_quote_status(p_id uuid,p_version integer,p_status text) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare q public.quotes;
begin
  if auth.uid() is null or not public.has_module(auth.uid(),'quotes') then raise exception 'Geen toegang tot Offertes' using errcode='42501'; end if;
  select * into q from public.quotes where id=p_id for update;
  if q.id is null then raise exception 'Offerte niet gevonden'; end if;
  if p_version is null or q.version <> p_version then raise exception 'Offerte is elders gewijzigd. Heropen de offerte.' using errcode='40001'; end if;
  if q.status not in ('concept','verzonden') or p_status is null or p_status not in ('verzonden','geaccepteerd','afgewezen','verlopen') or q.status=p_status
    then raise exception 'Deze statuswijziging is niet toegestaan'; end if;
  if p_status in ('verzonden','geaccepteerd') and q.valid_until < (now() at time zone 'Europe/Amsterdam')::date
    then raise exception 'Offerte is verlopen. Dupliceer deze met een nieuwe geldigheidsdatum.'; end if;
  update public.quotes set status=p_status,version=version+1,updated_at=now() where id=p_id returning * into q;
  return to_jsonb(q);
end; $$;

create or replace function public.convert_quote_to_invoice(p_id uuid,p_version integer) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare q public.quotes; iid uuid; num text; d date := (now() at time zone 'Europe/Amsterdam')::date; days integer; item jsonb;
begin
  if auth.uid() is null or not public.has_module(auth.uid(),'quotes') or not public.has_module(auth.uid(),'invoices')
    then raise exception 'Toegang tot Offertes én Facturen is vereist' using errcode='42501'; end if;
  select * into q from public.quotes where id=p_id for update;
  if q.id is null then raise exception 'Offerte niet gevonden'; end if;
  if q.invoice_id is not null then return to_jsonb(q); end if;
  if p_version is null or q.version <> p_version then raise exception 'Offerte is elders gewijzigd. Heropen de offerte.' using errcode='40001'; end if;
  if q.status <> 'geaccepteerd' then raise exception 'Alleen geaccepteerde offertes kunnen worden gefactureerd'; end if;
  select greatest(1,least(coalesce(payment_terms,14),365)) into days from public.settings limit 1;
  num := public.generate_invoice_number(extract(year from d)::integer);
  insert into public.invoices(invoice_number,customer_id,invoice_date,due_date,status,source_type,invoice_year,invoice_month,subtotal,vat_total,total,notes)
    values(num,q.customer_id,d,d+coalesce(days,14),'concept','generated',extract(year from d)::integer,extract(month from d)::integer,q.subtotal,q.vat_total,q.total,
      'Op basis van offerte '||q.quote_number||E'\n'||q.title||case when q.notes<>'' then E'\n'||q.notes else '' end)
    returning id into iid;
  for item in select value from jsonb_array_elements(q.items) loop
    insert into public.invoice_items(invoice_id,description,quantity,price,vat_percentage,subtotal)
      values(iid,(item->>'description')||case when q.discount_percentage>0 then ' ('||q.discount_percentage||'% korting verwerkt)' else '' end,
        (item->>'quantity')::numeric,(item->>'price')::numeric*(100-q.discount_percentage)/100,(item->>'vat_percentage')::numeric,(item->>'subtotal')::numeric);
  end loop;
  update public.quotes set invoice_id=iid,invoice_number=num,status='gefactureerd',version=version+1,updated_at=now() where id=p_id returning * into q;
  return to_jsonb(q);
end; $$;
revoke all on function public.save_quote(jsonb),public.set_quote_status(uuid,integer,text),public.convert_quote_to_invoice(uuid,integer) from public,anon;
grant execute on function public.save_quote(jsonb),public.set_quote_status(uuid,integer,text),public.convert_quote_to_invoice(uuid,integer) to authenticated;
-- Preserve the database's existing writer-fencing node (Supabase or Neon).
do $$ declare t text; definition text; begin
  select pg_get_triggerdef(oid) into definition from pg_trigger where tgrelid='public.invoices'::regclass and tgname='harkas_writer_fence';
  if definition is not null then
    foreach t in array array['quotes','quote_counters'] loop
      if not exists(select 1 from pg_trigger where tgrelid=('public.'||t)::regclass and tgname='harkas_writer_fence') then
        execute replace(definition,' ON public.invoices ',' ON public.'||quote_ident(t)||' ');
      end if;
    end loop;
  end if;
end $$;
notify pgrst,'reload schema';
