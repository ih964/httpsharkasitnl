-- Harkas Admin DR change capture
-- Production source: uqkrxzlkvjdmebsbdrmb.
-- Captures every supported application table into a private transactional outbox.

create table if not exists public.harkas_dr_outbox (
  id bigint generated always as identity primary key,
  table_name text not null,
  operation text not null check (operation in ('INSERT','UPDATE','DELETE')),
  row_data jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists harkas_dr_outbox_created_idx
  on public.harkas_dr_outbox(id);

create table if not exists public.harkas_dr_checkpoint (
  singleton boolean primary key default true,
  last_outbox_id bigint not null default 0,
  synced_at timestamptz not null default now(),
  status text not null default 'baseline_required',
  baseline_complete boolean not null default false,
  baseline_id text,
  baseline_hwm bigint not null default 0,
  source_node text not null default 'supabase'
);

insert into public.harkas_dr_checkpoint(singleton,status,baseline_complete)
values (true,'baseline_required',false)
on conflict (singleton) do nothing;

create or replace function public.harkas_dr_capture()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if TG_OP = 'DELETE' then
    insert into public.harkas_dr_outbox(table_name, operation, row_data)
    values (TG_TABLE_NAME, 'DELETE', to_jsonb(OLD));
    return OLD;
  end if;

  insert into public.harkas_dr_outbox(table_name, operation, row_data)
  values (TG_TABLE_NAME, TG_OP, to_jsonb(NEW));
  return NEW;
end;
$$;

do $$
declare
  table_name text;
  tables constant text[] := array[
    'activity_logs',
    'assessment_audit_events',
    'assessment_leads',
    'assessment_proposal_drafts',
    'assessment_runs',
    'assessment_submission_rate_limits',
    'customers',
    'domains',
    'invoice_counters',
    'invoice_items',
    'invoices',
    'keep_alive',
    'linkedin_audit_log',
    'linkedin_connections',
    'linkedin_internal_config',
    'linkedin_organization_analytics',
    'linkedin_organizations',
    'linkedin_post_queue',
    'linkedin_post_snapshots',
    'linkedin_profile_snapshots',
    'linkedin_repost_candidates',
    'managed_users',
    'password_vault',
    'settings',
    'time_entries',
    'user_module_access',
    'user_roles'
  ];
begin
  foreach table_name in array tables loop
    execute format(
      'drop trigger if exists harkas_dr_capture on public.%I',
      table_name
    );
    execute format(
      'create trigger harkas_dr_capture after insert or update or delete on public.%I for each row execute function public.harkas_dr_capture()',
      table_name
    );
  end loop;
end;
$$;

alter table public.harkas_dr_outbox enable row level security;
alter table public.harkas_dr_checkpoint enable row level security;
revoke all on public.harkas_dr_outbox from anon, authenticated;
revoke all on public.harkas_dr_checkpoint from anon, authenticated;
revoke execute on function public.harkas_dr_capture() from public, anon, authenticated;
