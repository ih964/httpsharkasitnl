-- Hosted migration version is recorded verbatim; additive and independent of legacy HA-routed tables.
create table public.one_calendar_events (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 title text not null check(length(btrim(title)) between 1 and 200), kind text not null default 'business' check(kind in ('private','business')),
 starts_at timestamptz not null, ends_at timestamptz not null, all_day boolean not null default false,
 timezone text not null default 'Europe/Amsterdam' check(timezone='Europe/Amsterdam'),
 location text not null default '' check(length(location)<=300), notes text not null default '' check(length(notes)<=4000),
 reminder_minutes integer check(reminder_minutes in (0,5,15,30,60,1440)), remind_at timestamptz, reminder_version uuid not null default gen_random_uuid(),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(ends_at>starts_at and starts_at>='2000-01-01'::timestamptz and ends_at<'2101-01-01'::timestamptz),
 check(not all_day or ((starts_at at time zone 'Europe/Amsterdam')::time='00:00'::time and (ends_at at time zone 'Europe/Amsterdam')::time='00:00'::time and (reminder_minutes is null or reminder_minutes in (0,1440))))
);
create index one_calendar_owner_start on public.one_calendar_events(user_id,starts_at);
create index one_calendar_reminders on public.one_calendar_events(remind_at) where remind_at is not null;
alter table public.one_calendar_events enable row level security;
revoke all on public.one_calendar_events from public,anon,authenticated;
grant select,insert,delete on public.one_calendar_events to authenticated;
grant update(title,kind,starts_at,ends_at,all_day,location,notes,reminder_minutes) on public.one_calendar_events to authenticated;
grant all on public.one_calendar_events to service_role;
create policy one_calendar_select on public.one_calendar_events for select to authenticated using(user_id=(select auth.uid()) and public.has_role((select auth.uid()),'admin'::text));
create policy one_calendar_insert on public.one_calendar_events for insert to authenticated with check(user_id=(select auth.uid()) and public.has_role((select auth.uid()),'admin'::text));
create policy one_calendar_update on public.one_calendar_events for update to authenticated using(user_id=(select auth.uid()) and public.has_role((select auth.uid()),'admin'::text)) with check(user_id=(select auth.uid()) and public.has_role((select auth.uid()),'admin'::text));
create policy one_calendar_delete on public.one_calendar_events for delete to authenticated using(user_id=(select auth.uid()) and public.has_role((select auth.uid()),'admin'::text));
create schema if not exists harkas_one_private;
revoke all on schema harkas_one_private from public,anon,authenticated;
create function harkas_one_private.prepare_calendar_event() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 new.updated_at:=clock_timestamp();
 if TG_OP='INSERT' then new.reminder_version:=gen_random_uuid();
 elsif (new.starts_at,new.all_day,new.reminder_minutes) is distinct from (old.starts_at,old.all_day,old.reminder_minutes) then new.reminder_version:=gen_random_uuid();
 else new.reminder_version:=old.reminder_version; end if;
 new.remind_at:=case when new.reminder_minutes is null then null when new.all_day then (((new.starts_at at time zone 'Europe/Amsterdam')::date+time '09:00') at time zone 'Europe/Amsterdam')-make_interval(mins=>new.reminder_minutes) else new.starts_at-make_interval(mins=>new.reminder_minutes) end;
 return new;
end $$;
revoke all on function harkas_one_private.prepare_calendar_event() from public,anon,authenticated;
create trigger one_calendar_prepare before insert or update on public.one_calendar_events for each row execute function harkas_one_private.prepare_calendar_event();
create table public.one_push_config (
 singleton boolean primary key default true check(singleton), cron_secret text not null default replace(gen_random_uuid()::text||gen_random_uuid()::text,'-',''),
 vapid_public text, vapid_private text, last_run_at timestamptz, last_success_at timestamptz, check((vapid_public is null)=(vapid_private is null))
);
insert into public.one_push_config(singleton) values(true);
create table public.one_push_subscriptions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 endpoint text not null unique check(length(endpoint) between 20 and 2048), p256dh text not null, auth_key text not null,
 calendar_enabled boolean not null default true, tickets_enabled boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), last_test_at timestamptz
);
create index one_push_subscription_owner on public.one_push_subscriptions(user_id);
create table public.one_push_deliveries (
 delivery_key text primary key check(length(delivery_key)<240), subscription_id uuid not null references public.one_push_subscriptions(id) on delete cascade,
 state text not null default 'processing' check(state in ('processing','accepted','obsolete')), attempts integer not null default 1,
 lease_until timestamptz not null default now()+interval '3 minutes', created_at timestamptz not null default now(), accepted_at timestamptz
);
create index one_push_delivery_age on public.one_push_deliveries(created_at);
alter table public.one_push_config enable row level security;
alter table public.one_push_subscriptions enable row level security;
alter table public.one_push_deliveries enable row level security;
revoke all on public.one_push_config,public.one_push_subscriptions,public.one_push_deliveries from public,anon,authenticated;
grant all on public.one_push_config,public.one_push_subscriptions,public.one_push_deliveries to service_role;
create function public.one_push_claim(p_key text,p_subscription uuid) returns boolean language sql security invoker set search_path='' as $$
 with claimed as (
 insert into public.one_push_deliveries(delivery_key,subscription_id) values(p_key,p_subscription)
 on conflict(delivery_key) do update set attempts=public.one_push_deliveries.attempts+1,lease_until=now()+interval '3 minutes'
 where public.one_push_deliveries.subscription_id=excluded.subscription_id and public.one_push_deliveries.state='processing' and public.one_push_deliveries.lease_until<now() and public.one_push_deliveries.attempts<4
 returning 1) select exists(select 1 from claimed);
$$;
revoke all on function public.one_push_claim(text,uuid) from public,anon,authenticated;
grant execute on function public.one_push_claim(text,uuid) to service_role;
comment on table public.one_calendar_events is 'Harkas One personal calendar: both private and business categories are owner-only. No external calendar sync.';
comment on table public.one_push_config is 'Server-only push signing keys and scheduler authentication. Never expose through browser APIs.';
comment on table public.one_push_deliveries is 'Per-device deduplication and retry leases; accepted means push service acceptance, not handset receipt.';
