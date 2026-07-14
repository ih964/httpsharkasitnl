-- Harkas One Release 1: Assessment Lead Engine
create extension if not exists pgcrypto;

create table if not exists public.assessment_leads (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text not null,
  email text not null,
  phone text,
  employee_count integer,
  status text not null default 'new' check (status in ('new','contacted','qualified','won','lost')),
  follow_up_at timestamptz,
  notes text,
  consent_report boolean not null default false,
  consent_marketing boolean not null default false,
  source text not null default 'it-quick-scan',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assessment_runs (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.assessment_leads(id) on delete set null,
  assessment_type text not null default 'it-quick-scan',
  template_version text not null default '1.0',
  total_score integer not null check (total_score between 0 and 100),
  risk_level text not null check (risk_level in ('low','medium','high')),
  answers jsonb not null default '{}'::jsonb,
  category_scores jsonb not null default '{}'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.assessment_audit_events (
  id uuid primary key default gen_random_uuid(),
  assessment_run_id uuid references public.assessment_runs(id) on delete cascade,
  lead_id uuid references public.assessment_leads(id) on delete cascade,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists assessment_leads_status_idx on public.assessment_leads(status);
create index if not exists assessment_leads_created_at_idx on public.assessment_leads(created_at desc);
create index if not exists assessment_runs_lead_id_idx on public.assessment_runs(lead_id);
create index if not exists assessment_runs_created_at_idx on public.assessment_runs(created_at desc);

create or replace function public.set_assessment_lead_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists assessment_leads_updated_at on public.assessment_leads;
create trigger assessment_leads_updated_at
before update on public.assessment_leads
for each row execute function public.set_assessment_lead_updated_at();

alter table public.assessment_leads enable row level security;
alter table public.assessment_runs enable row level security;
alter table public.assessment_audit_events enable row level security;

-- Authenticated admin users can manage records. Existing admin authentication remains the first release boundary.
create policy "authenticated read assessment leads"
on public.assessment_leads for select
to authenticated
using (true);

create policy "authenticated update assessment leads"
on public.assessment_leads for update
to authenticated
using (true)
with check (true);

create policy "authenticated read assessment runs"
on public.assessment_runs for select
to authenticated
using (true);

create policy "authenticated read assessment audit"
on public.assessment_audit_events for select
to authenticated
using (true);

-- Public submission is constrained to one RPC instead of anonymous table access.
create or replace function public.submit_it_quick_scan(
  p_company_name text,
  p_contact_name text,
  p_email text,
  p_phone text,
  p_employee_count integer,
  p_consent_report boolean,
  p_consent_marketing boolean,
  p_total_score integer,
  p_risk_level text,
  p_answers jsonb,
  p_category_scores jsonb,
  p_recommendations jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead_id uuid;
  v_run_id uuid;
begin
  if not p_consent_report then
    raise exception 'report consent required';
  end if;
  if length(trim(coalesce(p_company_name, ''))) < 2 then
    raise exception 'invalid company name';
  end if;
  if length(trim(coalesce(p_contact_name, ''))) < 2 then
    raise exception 'invalid contact name';
  end if;
  if p_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    raise exception 'invalid email';
  end if;
  if p_total_score < 0 or p_total_score > 100 then
    raise exception 'invalid score';
  end if;
  if p_risk_level not in ('low','medium','high') then
    raise exception 'invalid risk level';
  end if;

  insert into public.assessment_leads (
    company_name, contact_name, email, phone, employee_count,
    consent_report, consent_marketing
  ) values (
    trim(p_company_name), trim(p_contact_name), lower(trim(p_email)),
    nullif(trim(coalesce(p_phone, '')), ''), p_employee_count,
    p_consent_report, p_consent_marketing
  ) returning id into v_lead_id;

  insert into public.assessment_runs (
    lead_id, total_score, risk_level, answers, category_scores, recommendations
  ) values (
    v_lead_id, p_total_score, p_risk_level,
    coalesce(p_answers, '{}'::jsonb),
    coalesce(p_category_scores, '{}'::jsonb),
    coalesce(p_recommendations, '[]'::jsonb)
  ) returning id into v_run_id;

  insert into public.assessment_audit_events (assessment_run_id, lead_id, event_type)
  values (v_run_id, v_lead_id, 'submitted');

  return v_run_id;
end;
$$;

revoke all on function public.submit_it_quick_scan(text,text,text,text,integer,boolean,boolean,integer,text,jsonb,jsonb,jsonb) from public;
grant execute on function public.submit_it_quick_scan(text,text,text,text,integer,boolean,boolean,integer,text,jsonb,jsonb,jsonb) to anon, authenticated;
