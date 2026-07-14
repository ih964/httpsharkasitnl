-- Harkas One Release 1: audited CRM updates for assessment leads
create index if not exists assessment_audit_events_lead_created_idx
on public.assessment_audit_events(lead_id, created_at desc);

create or replace function public.update_assessment_lead(
  p_lead_id uuid,
  p_status text default null,
  p_notes text default null,
  p_follow_up_at timestamptz default null,
  p_update_status boolean default false,
  p_update_follow_up boolean default false
)
returns public.assessment_leads
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before public.assessment_leads;
  v_after public.assessment_leads;
  v_metadata jsonb := '{}'::jsonb;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select * into v_before
  from public.assessment_leads
  where id = p_lead_id
  for update;

  if not found then
    raise exception 'lead not found';
  end if;

  if p_update_status and p_status not in ('new','contacted','qualified','won','lost') then
    raise exception 'invalid status';
  end if;

  update public.assessment_leads
  set
    status = case when p_update_status then p_status else status end,
    notes = case when p_update_follow_up then nullif(left(trim(coalesce(p_notes, '')), 5000), '') else notes end,
    follow_up_at = case when p_update_follow_up then p_follow_up_at else follow_up_at end
  where id = p_lead_id
  returning * into v_after;

  if p_update_status and v_before.status is distinct from v_after.status then
    v_metadata := v_metadata || jsonb_build_object('status_from', v_before.status, 'status_to', v_after.status);
  end if;

  if p_update_follow_up then
    v_metadata := v_metadata || jsonb_build_object(
      'notes_changed', v_before.notes is distinct from v_after.notes,
      'follow_up_from', v_before.follow_up_at,
      'follow_up_to', v_after.follow_up_at
    );
  end if;

  if v_metadata <> '{}'::jsonb then
    insert into public.assessment_audit_events (lead_id, event_type, metadata)
    values (
      p_lead_id,
      case when p_update_status and p_update_follow_up then 'lead_updated'
           when p_update_status then 'status_updated'
           else 'follow_up_updated' end,
      v_metadata || jsonb_build_object('actor_user_id', auth.uid())
    );
  end if;

  return v_after;
end;
$$;

revoke all on function public.update_assessment_lead(uuid,text,text,timestamptz,boolean,boolean) from public;
grant execute on function public.update_assessment_lead(uuid,text,text,timestamptz,boolean,boolean) to authenticated;
