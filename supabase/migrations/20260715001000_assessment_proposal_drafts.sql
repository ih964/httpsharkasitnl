-- Harkas One Release 1: manually priced proposal drafts for assessment leads
create table if not exists public.assessment_proposal_drafts (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null unique references public.assessment_leads(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  title text not null,
  introduction text,
  line_items jsonb not null default '[]'::jsonb,
  notes text,
  valid_until date,
  status text not null default 'draft' check (status in ('draft','reviewed','approved')),
  subtotal numeric(12,2) not null default 0,
  vat_total numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists assessment_proposal_drafts_customer_idx
on public.assessment_proposal_drafts(customer_id);

alter table public.assessment_proposal_drafts enable row level security;

create policy "authenticated read assessment proposal drafts"
on public.assessment_proposal_drafts for select
to authenticated
using (true);

create or replace function public.save_assessment_proposal_draft(
  p_lead_id uuid,
  p_title text,
  p_introduction text,
  p_line_items jsonb,
  p_notes text default null,
  p_valid_until date default null
)
returns public.assessment_proposal_drafts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead public.assessment_leads;
  v_result public.assessment_proposal_drafts;
  v_subtotal numeric(12,2);
  v_vat_total numeric(12,2);
  v_total numeric(12,2);
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select * into v_lead
  from public.assessment_leads
  where id = p_lead_id;

  if not found then
    raise exception 'lead not found';
  end if;

  if length(trim(coalesce(p_title, ''))) < 3 or length(trim(p_title)) > 180 then
    raise exception 'invalid title';
  end if;

  if p_introduction is not null and length(p_introduction) > 3000 then
    raise exception 'introduction too long';
  end if;

  if p_notes is not null and length(p_notes) > 5000 then
    raise exception 'notes too long';
  end if;

  if jsonb_typeof(coalesce(p_line_items, 'null'::jsonb)) <> 'array' then
    raise exception 'line items must be an array';
  end if;

  if jsonb_array_length(p_line_items) < 1 or jsonb_array_length(p_line_items) > 20 then
    raise exception 'proposal must contain 1 to 20 lines';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_line_items) item
    where jsonb_typeof(item) <> 'object'
       or jsonb_typeof(item->'description') <> 'string'
       or length(trim(item->>'description')) < 2
       or length(trim(item->>'description')) > 240
       or jsonb_typeof(item->'quantity') <> 'number'
       or (item->>'quantity')::numeric <= 0
       or (item->>'quantity')::numeric > 10000
       or jsonb_typeof(item->'unit_price') <> 'number'
       or (item->>'unit_price')::numeric < 0
       or (item->>'unit_price')::numeric > 1000000
       or jsonb_typeof(item->'vat_percentage') <> 'number'
       or (item->>'vat_percentage')::numeric not in (0, 9, 21)
  ) then
    raise exception 'invalid proposal line';
  end if;

  select
    round(coalesce(sum((item->>'quantity')::numeric * (item->>'unit_price')::numeric), 0), 2),
    round(coalesce(sum((item->>'quantity')::numeric * (item->>'unit_price')::numeric * (item->>'vat_percentage')::numeric / 100), 0), 2)
  into v_subtotal, v_vat_total
  from jsonb_array_elements(p_line_items) item;

  v_total := round(v_subtotal + v_vat_total, 2);

  insert into public.assessment_proposal_drafts (
    lead_id,
    customer_id,
    title,
    introduction,
    line_items,
    notes,
    valid_until,
    subtotal,
    vat_total,
    total,
    created_by,
    updated_at
  ) values (
    p_lead_id,
    v_lead.customer_id,
    trim(p_title),
    nullif(trim(coalesce(p_introduction, '')), ''),
    p_line_items,
    nullif(trim(coalesce(p_notes, '')), ''),
    p_valid_until,
    v_subtotal,
    v_vat_total,
    v_total,
    auth.uid(),
    now()
  )
  on conflict (lead_id) do update set
    customer_id = excluded.customer_id,
    title = excluded.title,
    introduction = excluded.introduction,
    line_items = excluded.line_items,
    notes = excluded.notes,
    valid_until = excluded.valid_until,
    subtotal = excluded.subtotal,
    vat_total = excluded.vat_total,
    total = excluded.total,
    updated_at = now()
  returning * into v_result;

  insert into public.assessment_audit_events (lead_id, event_type, metadata)
  values (
    p_lead_id,
    'proposal_draft_saved',
    jsonb_build_object(
      'proposal_id', v_result.id,
      'subtotal', v_result.subtotal,
      'vat_total', v_result.vat_total,
      'total', v_result.total,
      'line_count', jsonb_array_length(p_line_items),
      'actor_user_id', auth.uid()
    )
  );

  return v_result;
end;
$$;

revoke all on function public.save_assessment_proposal_draft(uuid,text,text,jsonb,text,date) from public;
grant execute on function public.save_assessment_proposal_draft(uuid,text,text,jsonb,text,date) to authenticated;
