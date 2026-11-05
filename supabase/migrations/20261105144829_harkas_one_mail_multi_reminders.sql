-- Additive upgrade: keep old single-reminder clients compatible; never rotate push keys.
alter table public.one_calendar_events add column reminder_offsets integer[];
update public.one_calendar_events set reminder_offsets=case when reminder_minutes is null then '{}'::integer[] else array[reminder_minutes] end;
alter table public.one_calendar_events alter column reminder_offsets set not null;
alter table public.one_calendar_events add constraint one_calendar_offsets_valid check (
 cardinality(reminder_offsets)<=10 and array_position(reminder_offsets,null) is null
 and reminder_offsets <@ array[0,5,15,30,60,120,1440,2880,7200,10080]
 and (not all_day or reminder_offsets <@ array[0,60,1440,2880,7200,10080])
);
grant update(reminder_offsets) on public.one_calendar_events to authenticated;
create or replace function harkas_one_private.prepare_calendar_event() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 new.updated_at:=clock_timestamp();
 if TG_OP='INSERT' then
  new.reminder_offsets:=coalesce(new.reminder_offsets,case when new.reminder_minutes is null then '{}'::integer[] else array[new.reminder_minutes] end);
  new.reminder_version:=gen_random_uuid();
 else
  -- Old clients only send the scalar. A modern array change always takes precedence.
  if new.reminder_offsets is not distinct from old.reminder_offsets and new.reminder_minutes is distinct from old.reminder_minutes then
   new.reminder_offsets:=case when new.reminder_minutes is null then '{}'::integer[] else array[new.reminder_minutes] end;
  end if;
  -- Changing a selection must not re-send an already delivered offset. Removing it is rechecked by the dispatcher.
  if (new.starts_at,new.all_day) is distinct from (old.starts_at,old.all_day) then new.reminder_version:=gen_random_uuid();
  else new.reminder_version:=old.reminder_version; end if;
 end if;
 if new.reminder_offsets is null or cardinality(new.reminder_offsets)>10 or array_position(new.reminder_offsets,null) is not null then raise exception 'Invalid reminder selection' using errcode='23514'; end if;
 new.reminder_offsets:=array(select distinct n from unnest(new.reminder_offsets) n order by n desc);
 -- Scalar projection keeps the preceding production build functional during rollout.
 new.reminder_minutes:=(select n from unnest(new.reminder_offsets) n where n=any(case when new.all_day then array[0,1440] else array[0,5,15,30,60,1440] end) order by n desc limit 1);
 new.remind_at:=case when new.reminder_minutes is null then null when new.all_day then (((new.starts_at at time zone 'Europe/Amsterdam')::date-new.reminder_minutes/1440+time '09:00') at time zone 'Europe/Amsterdam') else new.starts_at-make_interval(mins=>new.reminder_minutes) end;
 return new;
end $$;
revoke all on function harkas_one_private.prepare_calendar_event() from public,anon,authenticated;
-- Preserve any earlier accepted single reminders when delivery keys gain an offset.
update public.one_push_deliveries d set delivery_key='calendar:'||e.id||':'||e.reminder_version||':'||e.reminder_minutes||':'||d.subscription_id
from public.one_calendar_events e where d.delivery_key='calendar:'||e.id||':'||e.reminder_version||':'||d.subscription_id and e.reminder_minutes is not null;
create function public.one_due_calendar_reminders(p_user uuid,p_now timestamptz default now())
returns table(id uuid,starts_at timestamptz,all_day boolean,offset_minutes integer,remind_at timestamptz,reminder_version uuid)
language sql stable security invoker set search_path='' as $$
 select e.id,e.starts_at,e.all_day,r.n,d.at,e.reminder_version
 from public.one_calendar_events e cross join lateral unnest(e.reminder_offsets) r(n)
 cross join lateral (select case when e.all_day then
  (((e.starts_at at time zone 'Europe/Amsterdam')::date-r.n/1440+time '09:00') at time zone 'Europe/Amsterdam')-make_interval(mins=>r.n%1440)
  else e.starts_at-make_interval(mins=>r.n) end as at) d
 where e.user_id=p_user and e.starts_at>=p_now-interval '2 days' and e.starts_at<=p_now+interval '8 days'
 and d.at>p_now-interval '15 minutes' and d.at<=p_now order by d.at,e.id,r.n limit 100;
$$;
revoke all on function public.one_due_calendar_reminders(uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.one_due_calendar_reminders(uuid,timestamptz) to service_role;
alter table public.one_push_subscriptions add column mail_enabled boolean not null default false, add column mail_enabled_at timestamptz;
alter table public.one_push_config add column mail_poll_enabled boolean not null default false, add column mail_last_run_at timestamptz, add column mail_last_success_at timestamptz;
create table public.one_mail_cursors (
 account text primary key check(account in ('info','administratie','support')),
 uid_validity text not null check(uid_validity ~ '^[0-9]+$'), last_uid bigint not null check(last_uid>=0),
 initialized_at timestamptz not null default now(), last_checked_at timestamptz not null default now()
);
create table public.one_mail_events (
 id uuid primary key default gen_random_uuid(), account text not null check(account in ('info','administratie','support')),
 uid_validity text not null check(uid_validity ~ '^[0-9]+$'), uid bigint not null check(uid>0),
 received_at timestamptz not null, created_at timestamptz not null default now(), unique(account,uid_validity,uid)
);
create index one_mail_events_received on public.one_mail_events(received_at);
alter table public.one_mail_cursors enable row level security;
alter table public.one_mail_events enable row level security;
revoke all on public.one_mail_cursors,public.one_mail_events from public,anon,authenticated;
grant all on public.one_mail_cursors,public.one_mail_events to service_role;
comment on table public.one_mail_events is 'Server-only deduplicated INBOX arrival metadata. No subject, sender, body, attachment or email-derived instructions.';
notify pgrst,'reload schema';
