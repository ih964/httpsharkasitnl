-- A previous-day all-day reminder is 09:00 LOCAL time, not 24 real hours before 09:00.
create or replace function harkas_one_private.prepare_calendar_event() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 new.updated_at:=clock_timestamp();
 if TG_OP='INSERT' then new.reminder_version:=gen_random_uuid();
 elsif (new.starts_at,new.all_day,new.reminder_minutes) is distinct from (old.starts_at,old.all_day,old.reminder_minutes) then new.reminder_version:=gen_random_uuid();
 else new.reminder_version:=old.reminder_version; end if;
 new.remind_at:=case when new.reminder_minutes is null then null when new.all_day then (((new.starts_at at time zone 'Europe/Amsterdam')::date-(case when new.reminder_minutes=1440 then 1 else 0 end)+time '09:00') at time zone 'Europe/Amsterdam') else new.starts_at-make_interval(mins=>new.reminder_minutes) end;
 return new;
end $$;
revoke all on function harkas_one_private.prepare_calendar_event() from public,anon,authenticated;
