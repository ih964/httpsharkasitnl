-- Harkas One Release 1: convert a qualified assessment lead into an existing customer record
alter table public.assessment_leads
add column if not exists customer_id uuid references public.customers(id) on delete set null;

create index if not exists assessment_leads_customer_id_idx
on public.assessment_leads(customer_id);

create or replace function public.convert_assessment_lead_to_customer(p_lead_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead public.assessment_leads;
  v_customer_id uuid;
  v_existing_customer_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select * into v_lead
  from public.assessment_leads
  where id = p_lead_id
  for update;

  if not found then
    raise exception 'lead not found';
  end if;

  if v_lead.customer_id is not null then
    return v_lead.customer_id;
  end if;

  select id into v_existing_customer_id
  from public.customers
  where email is not null
    and lower(trim(email)) = lower(trim(v_lead.email))
  order by created_at asc
  limit 1;

  if v_existing_customer_id is not null then
    v_customer_id := v_existing_customer_id;
  else
    insert into public.customers (
      name,
      company_name,
      email,
      phone,
      notes
    ) values (
      v_lead.contact_name,
      v_lead.company_name,
      v_lead.email,
      v_lead.phone,
      concat_ws(E'\n\n',
        nullif(trim(coalesce(v_lead.notes, '')), ''),
        'Aangemaakt vanuit IT Quick Scan op ' || to_char(v_lead.created_at at time zone 'Europe/Amsterdam', 'DD-MM-YYYY HH24:MI')
      )
    ) returning id into v_customer_id;
  end if;

  update public.assessment_leads
  set customer_id = v_customer_id,
      status = 'won'
  where id = p_lead_id;

  insert into public.assessment_audit_events (lead_id, event_type, metadata)
  values (
    p_lead_id,
    'converted_to_customer',
    jsonb_build_object(
      'customer_id', v_customer_id,
      'reused_existing_customer', v_existing_customer_id is not null,
      'actor_user_id', auth.uid()
    )
  );

  return v_customer_id;
end;
$$;

revoke all on function public.convert_assessment_lead_to_customer(uuid) from public;
grant execute on function public.convert_assessment_lead_to_customer(uuid) to authenticated;
