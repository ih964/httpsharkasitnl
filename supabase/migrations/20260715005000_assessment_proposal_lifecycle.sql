-- Harkas One Release 1: manual proposal delivery and customer outcome lifecycle
alter table public.assessment_proposal_drafts
  add column if not exists sent_at timestamptz,
  add column if not exists sent_by uuid,
  add column if not exists sent_to text,
  add column if not exists follow_up_at timestamptz,
  add column if not exists responded_at timestamptz,
  add column if not exists response_note text;

alter table public.assessment_proposal_drafts
  drop constraint if exists assessment_proposal_drafts_status_check;

alter table public.assessment_proposal_drafts
  add constraint assessment_proposal_drafts_status_check
  check (status in ('draft','reviewed','approved','sent','accepted','rejected'));

create index if not exists assessment_proposal_drafts_follow_up_idx
on public.assessment_proposal_drafts(follow_up_at)
where status = 'sent';

create or replace function public.reset_assessment_proposal_lifecycle_on_edit()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if old.title is distinct from new.title
     or old.introduction is distinct from new.introduction
     or old.line_items is distinct from new.line_items
     or old.notes is distinct from new.notes
     or old.valid_until is distinct from new.valid_until
     or old.subtotal is distinct from new.subtotal
     or old.vat_total is distinct from new.vat_total
     or old.total is distinct from new.total then
    new.status := 'draft';
    new.reviewed_at := null;
    new.reviewed_by := null;
    new.approved_at := null;
    new.approved_by := null;
    new.sent_at := null;
    new.sent_by := null;
    new.sent_to := null;
    new.follow_up_at := null;
    new.responded_at := null;
    new.response_note := null;
  end if;
  return new;
end;
$$;

drop trigger if exists assessment_proposal_reset_lifecycle_on_edit
on public.assessment_proposal_drafts;

create trigger assessment_proposal_reset_lifecycle_on_edit
before update of title, introduction, line_items, notes, valid_until, subtotal, vat_total, total
on public.assessment_proposal_drafts
for each row execute function public.reset_assessment_proposal_lifecycle_on_edit();

create or replace function public.update_assessment_proposal_lifecycle(
  p_proposal_id uuid,
  p_status text,
  p_sent_to text default null,
  p_follow_up_at timestamptz default null,
  p_response_note text default null
)
returns public.assessment_proposal_drafts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before public.assessment_proposal_drafts;
  v_after public.assessment_proposal_drafts;
  v_sent_to text;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if p_status not in ('draft','reviewed','approved','sent','accepted','rejected') then
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

  if v_before.status = 'draft' and p_status not in ('reviewed') then
    raise exception 'invalid proposal transition';
  elsif v_before.status = 'reviewed' and p_status not in ('draft','approved') then
    raise exception 'invalid proposal transition';
  elsif v_before.status = 'approved' and p_status not in ('draft','reviewed','sent') then
    raise exception 'invalid proposal transition';
  elsif v_before.status = 'sent' and p_status not in ('draft','accepted','rejected') then
    raise exception 'invalid proposal transition';
  elsif v_before.status in ('accepted','rejected') and p_status <> 'draft' then
    raise exception 'invalid proposal transition';
  end if;

  if p_status = 'sent' then
    v_sent_to := lower(trim(coalesce(p_sent_to, '')));
    if v_sent_to !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
      raise exception 'valid recipient email required';
    end if;
  else
    v_sent_to := v_before.sent_to;
  end if;

  if p_response_note is not null and length(p_response_note) > 2000 then
    raise exception 'response note too long';
  end if;

  update public.assessment_proposal_drafts
  set
    status = p_status,
    reviewed_at = case
      when p_status = 'draft' then null
      when p_status in ('reviewed','approved','sent','accepted','rejected') then coalesce(reviewed_at, now())
      else reviewed_at
    end,
    reviewed_by = case
      when p_status = 'draft' then null
      when p_status in ('reviewed','approved','sent','accepted','rejected') then coalesce(reviewed_by, auth.uid())
      else reviewed_by
    end,
    approved_at = case
      when p_status in ('approved','sent','accepted','rejected') then coalesce(approved_at, now())
      else null
    end,
    approved_by = case
      when p_status in ('approved','sent','accepted','rejected') then coalesce(approved_by, auth.uid())
      else null
    end,
    sent_at = case
      when p_status in ('sent','accepted','rejected') then coalesce(sent_at, now())
      else null
    end,
    sent_by = case
      when p_status in ('sent','accepted','rejected') then coalesce(sent_by, auth.uid())
      else null
    end,
    sent_to = case
      when p_status = 'sent' then v_sent_to
      when p_status in ('accepted','rejected') then sent_to
      else null
    end,
    follow_up_at = case
      when p_status = 'sent' then p_follow_up_at
      when p_status in ('accepted','rejected') then follow_up_at
      else null
    end,
    responded_at = case
      when p_status in ('accepted','rejected') then now()
      else null
    end,
    response_note = case
      when p_status in ('accepted','rejected') then nullif(left(trim(coalesce(p_response_note, '')), 2000), '')
      else null
    end,
    updated_at = now()
  where id = p_proposal_id
  returning * into v_after;

  insert into public.assessment_audit_events (lead_id, event_type, metadata)
  values (
    v_after.lead_id,
    'proposal_lifecycle_updated',
    jsonb_build_object(
      'proposal_id', v_after.id,
      'status_from', v_before.status,
      'status_to', v_after.status,
      'sent_to', v_after.sent_to,
      'follow_up_at', v_after.follow_up_at,
      'response_note', v_after.response_note,
      'total', v_after.total,
      'actor_user_id', auth.uid()
    )
  );

  return v_after;
end;
$$;

revoke all on function public.update_assessment_proposal_lifecycle(uuid,text,text,timestamptz,text) from public;
grant execute on function public.update_assessment_proposal_lifecycle(uuid,text,text,timestamptz,text) to authenticated;

-- The earlier three-state RPC is no longer allowed to bypass lifecycle validation.
revoke all on function public.update_assessment_proposal_status(uuid,text) from authenticated;
