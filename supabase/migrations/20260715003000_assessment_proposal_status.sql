-- Harkas One Release 1: reviewed and approved workflow for internal proposal drafts
alter table public.assessment_proposal_drafts
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid;

create index if not exists assessment_proposal_drafts_status_idx
on public.assessment_proposal_drafts(status, updated_at desc);

create or replace function public.update_assessment_proposal_status(
  p_proposal_id uuid,
  p_status text
)
returns public.assessment_proposal_drafts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before public.assessment_proposal_drafts;
  v_after public.assessment_proposal_drafts;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if p_status not in ('draft', 'reviewed', 'approved') then
    raise exception 'invalid proposal status';
  end if;

  select * into v_before
  from public.assessment_proposal_drafts
  where id = p_proposal_id
  for update;

  if not found then
    raise exception 'proposal not found';
  end if;

  if v_before.status = p_status then
    return v_before;
  end if;

  update public.assessment_proposal_drafts
  set
    status = p_status,
    reviewed_at = case
      when p_status = 'draft' then null
      when p_status in ('reviewed', 'approved') then coalesce(reviewed_at, now())
      else reviewed_at
    end,
    reviewed_by = case
      when p_status = 'draft' then null
      when p_status in ('reviewed', 'approved') then coalesce(reviewed_by, auth.uid())
      else reviewed_by
    end,
    approved_at = case
      when p_status = 'approved' then now()
      else null
    end,
    approved_by = case
      when p_status = 'approved' then auth.uid()
      else null
    end,
    updated_at = now()
  where id = p_proposal_id
  returning * into v_after;

  insert into public.assessment_audit_events (lead_id, event_type, metadata)
  values (
    v_after.lead_id,
    'proposal_status_updated',
    jsonb_build_object(
      'proposal_id', v_after.id,
      'status_from', v_before.status,
      'status_to', v_after.status,
      'total', v_after.total,
      'actor_user_id', auth.uid()
    )
  );

  return v_after;
end;
$$;

revoke all on function public.update_assessment_proposal_status(uuid,text) from public;
grant execute on function public.update_assessment_proposal_status(uuid,text) to authenticated;
