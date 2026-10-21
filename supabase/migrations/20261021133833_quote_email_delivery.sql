-- Keep the immutable provider request so retries cannot produce a second email.
alter table public.quotes add column if not exists emailed_at timestamptz;
alter table public.quotes add column if not exists emailed_to text;
alter table public.quotes add column if not exists emailed_cc jsonb;

create table if not exists public.quote_email_deliveries (
  id uuid primary key,
  quote_id uuid not null references public.quotes(id),
  quote_version integer not null,
  recipient_email text not null,
  cc_emails jsonb not null default '[]'::jsonb,
  state text not null default 'pending' check (state in ('pending','sent','failed')),
  payload jsonb not null,
  provider_id text,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  check (jsonb_typeof(cc_emails)='array'),
  check (jsonb_typeof(payload)='object')
);
create index if not exists quote_email_deliveries_quote_idx on public.quote_email_deliveries(quote_id,created_at desc);
create unique index if not exists quote_email_one_pending_idx on public.quote_email_deliveries(quote_id) where state='pending';
alter table public.quote_email_deliveries enable row level security;
revoke all on public.quote_email_deliveries from public,anon,authenticated;

-- An unconfirmed delivery must retain the exact saved quote it refers to.
create or replace function public.guard_pending_quote_email() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  if exists(select 1 from public.quote_email_deliveries where quote_id=old.id and state='pending') then
    raise exception 'De e-mailverzending is nog niet bevestigd. Rond dezelfde verzending af voordat je de offerte wijzigt.' using errcode='40001';
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end; $$;
revoke all on function public.guard_pending_quote_email() from public,anon,authenticated;
create trigger quote_email_pending_guard before update or delete on public.quotes
  for each row execute function public.guard_pending_quote_email();

-- Copy the local writer fence, so source and standby keep their own node identity.
do $$ declare definition text; begin
  select pg_get_triggerdef(oid) into definition from pg_trigger where tgrelid='public.quotes'::regclass and tgname='harkas_writer_fence';
  if definition is not null then
    execute replace(definition,' ON public.quotes ',' ON public.quote_email_deliveries ');
  end if;
  if to_regprocedure('public.harkas_dr_capture()') is not null then
    create trigger harkas_dr_capture after insert or update or delete on public.quote_email_deliveries
      for each row execute function public.harkas_dr_capture();
  end if;
end $$;
notify pgrst,'reload schema';
