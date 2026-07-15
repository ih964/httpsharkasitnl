-- Harkas One Release 1: authorization, consent evidence and public submission hardening
create extension if not exists pgcrypto;

-- Central server-side authorization boundary for all internal assessment data.
create or replace function public.is_harkas_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and public.has_role(auth.uid(), 'admin'::public.app_role);
$$;

revoke all on function public.is_harkas_admin() from public;
grant execute on function public.is_harkas_admin() to authenticated;

-- Store consent evidence and an idempotency key with every public scan submission.
alter table public.assessment_leads
  add column if not exists submission_key uuid,
  add column if not exists privacy_notice_version text,
  add column if not exists consent_recorded_at timestamptz,
  add column if not exists retention_until date;

create unique index if not exists assessment_leads_submission_key_idx
on public.assessment_leads(submission_key)
where submission_key is not null;

create index if not exists assessment_leads_retention_until_idx
on public.assessment_leads(retention_until)
where retention_until is not null;

-- Internal assessment records are readable and mutable by administrators only.
drop policy if exists "authenticated read assessment leads" on public.assessment_leads;
drop policy if exists "authenticated update assessment leads" on public.assessment_leads;
drop policy if exists "admin read assessment leads" on public.assessment_leads;
drop policy if exists "admin update assessment leads" on public.assessment_leads;

create policy "admin read assessment leads"
on public.assessment_leads for select
to authenticated
using (public.is_harkas_admin());

create policy "admin update assessment leads"
on public.assessment_leads for update
to authenticated
using (public.is_harkas_admin())
with check (public.is_harkas_admin());

drop policy if exists "authenticated read assessment runs" on public.assessment_runs;
drop policy if exists "admin read assessment runs" on public.assessment_runs;
create policy "admin read assessment runs"
on public.assessment_runs for select
to authenticated
using (public.is_harkas_admin());

drop policy if exists "authenticated read assessment audit" on public.assessment_audit_events;
drop policy if exists "admin read assessment audit" on public.assessment_audit_events;
create policy "admin read assessment audit"
on public.assessment_audit_events for select
to authenticated
using (public.is_harkas_admin());

drop policy if exists "authenticated read assessment proposal drafts" on public.assessment_proposal_drafts;
drop policy if exists "admin read assessment proposal drafts" on public.assessment_proposal_drafts;
create policy "admin read assessment proposal drafts"
on public.assessment_proposal_drafts for select
to authenticated
using (public.is_harkas_admin());

-- Defense in depth: security-definer functions must still pass this write guard.
create or replace function public.assert_harkas_admin_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_harkas_admin() then
    raise exception 'administrator role required' using errcode = '42501';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function public.assert_harkas_admin_write() from public;

drop trigger if exists assessment_leads_admin_write_guard on public.assessment_leads;
create trigger assessment_leads_admin_write_guard
before update or delete on public.assessment_leads
for each row execute function public.assert_harkas_admin_write();

drop trigger if exists assessment_proposals_admin_write_guard on public.assessment_proposal_drafts;
create trigger assessment_proposals_admin_write_guard
before insert or update or delete on public.assessment_proposal_drafts
for each row execute function public.assert_harkas_admin_write();

-- Anonymous rate-limit state. There are deliberately no direct client policies.
create table if not exists public.assessment_submission_rate_limits (
  fingerprint_hash text primary key,
  window_started_at timestamptz not null default now(),
  submission_count integer not null default 1 check (submission_count > 0),
  updated_at timestamptz not null default now()
);

alter table public.assessment_submission_rate_limits enable row level security;
revoke all on table public.assessment_submission_rate_limits from anon, authenticated;

-- Replace the original unrestricted anonymous RPC with a hardened version.
revoke all on function public.submit_it_quick_scan(text,text,text,text,integer,boolean,boolean,integer,text,jsonb,jsonb,jsonb) from public, anon, authenticated;
drop function if exists public.submit_it_quick_scan(text,text,text,text,integer,boolean,boolean,integer,text,jsonb,jsonb,jsonb);

create or replace function public.submit_it_quick_scan(
  p_submission_key uuid,
  p_honeypot text,
  p_privacy_notice_version text,
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
  v_existing_run_id uuid;
  v_email text;
  v_phone text;
  v_headers jsonb := '{}'::jsonb;
  v_remote_hint text := 'unknown';
  v_fingerprint text;
  v_submission_count integer;
begin
  if p_submission_key is null then
    raise exception 'submission key required';
  end if;

  -- Idempotent retry: return the already-created run without counting it again.
  select r.id into v_existing_run_id
  from public.assessment_leads l
  join public.assessment_runs r on r.lead_id = l.id
  where l.submission_key = p_submission_key
  order by r.created_at asc
  limit 1;

  if v_existing_run_id is not null then
    return v_existing_run_id;
  end if;

  if length(trim(coalesce(p_honeypot, ''))) > 0 then
    raise exception 'bot submission rejected';
  end if;

  if not p_consent_report then
    raise exception 'report consent required';
  end if;

  if length(trim(coalesce(p_privacy_notice_version, ''))) < 8
     or length(trim(p_privacy_notice_version)) > 40 then
    raise exception 'privacy notice version required';
  end if;

  if length(trim(coalesce(p_company_name, ''))) < 2
     or length(trim(p_company_name)) > 120 then
    raise exception 'invalid company name';
  end if;

  if length(trim(coalesce(p_contact_name, ''))) < 2
     or length(trim(p_contact_name)) > 120 then
    raise exception 'invalid contact name';
  end if;

  v_email := lower(trim(coalesce(p_email, '')));
  if length(v_email) > 180
     or v_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    raise exception 'invalid email';
  end if;

  v_phone := nullif(trim(coalesce(p_phone, '')), '');
  if v_phone is not null
     and (length(v_phone) > 40 or v_phone !~ '^[0-9+() .-]{7,40}$') then
    raise exception 'invalid phone';
  end if;

  if p_employee_count is not null
     and (p_employee_count < 1 or p_employee_count > 10000) then
    raise exception 'invalid employee count';
  end if;

  if p_total_score < 0 or p_total_score > 100 then
    raise exception 'invalid score';
  end if;

  if p_risk_level not in ('low','medium','high') then
    raise exception 'invalid risk level';
  end if;

  if jsonb_typeof(coalesce(p_answers, 'null'::jsonb)) <> 'object'
     or octet_length(p_answers::text) > 20000 then
    raise exception 'invalid answers payload';
  end if;

  if jsonb_typeof(coalesce(p_category_scores, 'null'::jsonb)) <> 'object'
     or octet_length(p_category_scores::text) > 10000 then
    raise exception 'invalid category scores payload';
  end if;

  if jsonb_typeof(coalesce(p_recommendations, 'null'::jsonb)) <> 'array'
     or jsonb_array_length(p_recommendations) > 20
     or octet_length(p_recommendations::text) > 30000 then
    raise exception 'invalid recommendations payload';
  end if;

  begin
    v_headers := nullif(current_setting('request.headers', true), '')::jsonb;
  exception when others then
    v_headers := '{}'::jsonb;
  end;

  v_remote_hint := split_part(
    coalesce(
      nullif(v_headers->>'cf-connecting-ip', ''),
      nullif(v_headers->>'x-real-ip', ''),
      nullif(v_headers->>'x-forwarded-for', ''),
      'unknown'
    ),
    ',',
    1
  );

  -- Store only a one-way fingerprint; never persist the raw network address.
  v_fingerprint := encode(digest(v_email || '|' || trim(v_remote_hint), 'sha256'), 'hex');

  insert into public.assessment_submission_rate_limits (
    fingerprint_hash,
    window_started_at,
    submission_count,
    updated_at
  ) values (
    v_fingerprint,
    now(),
    1,
    now()
  )
  on conflict (fingerprint_hash) do update set
    submission_count = case
      when assessment_submission_rate_limits.window_started_at < now() - interval '1 hour' then 1
      else assessment_submission_rate_limits.submission_count + 1
    end,
    window_started_at = case
      when assessment_submission_rate_limits.window_started_at < now() - interval '1 hour' then now()
      else assessment_submission_rate_limits.window_started_at
    end,
    updated_at = now()
  returning submission_count into v_submission_count;

  if v_submission_count > 3 then
    raise exception 'rate limit exceeded';
  end if;

  insert into public.assessment_leads (
    submission_key,
    company_name,
    contact_name,
    email,
    phone,
    employee_count,
    consent_report,
    consent_marketing,
    privacy_notice_version,
    consent_recorded_at,
    retention_until
  ) values (
    p_submission_key,
    trim(p_company_name),
    trim(p_contact_name),
    v_email,
    v_phone,
    p_employee_count,
    p_consent_report,
    p_consent_marketing,
    trim(p_privacy_notice_version),
    now(),
    current_date + 730
  )
  returning id into v_lead_id;

  insert into public.assessment_runs (
    lead_id,
    total_score,
    risk_level,
    answers,
    category_scores,
    recommendations
  ) values (
    v_lead_id,
    p_total_score,
    p_risk_level,
    p_answers,
    p_category_scores,
    p_recommendations
  )
  returning id into v_run_id;

  insert into public.assessment_audit_events (
    assessment_run_id,
    lead_id,
    event_type,
    metadata
  ) values (
    v_run_id,
    v_lead_id,
    'submitted',
    jsonb_build_object(
      'privacy_notice_version', trim(p_privacy_notice_version),
      'consent_report', p_consent_report,
      'consent_marketing', p_consent_marketing,
      'retention_until', current_date + 730
    )
  );

  return v_run_id;
end;
$$;

revoke all on function public.submit_it_quick_scan(uuid,text,text,text,text,text,text,integer,boolean,boolean,integer,text,jsonb,jsonb,jsonb) from public;
grant execute on function public.submit_it_quick_scan(uuid,text,text,text,text,text,text,integer,boolean,boolean,integer,text,jsonb,jsonb,jsonb) to anon, authenticated;
