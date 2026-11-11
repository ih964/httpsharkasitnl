-- Extend only the fixed account allowlist. Preserve all mail cursors, events and push subscriptions.
begin;
alter table public.one_mail_cursors drop constraint one_mail_cursors_account_check;
alter table public.one_mail_cursors add constraint one_mail_cursors_account_check check(account in ('info','administratie','support','webbuilder_info','webbuilder_admin'));
alter table public.one_mail_events drop constraint one_mail_events_account_check;
alter table public.one_mail_events add constraint one_mail_events_account_check check(account in ('info','administratie','support','webbuilder_info','webbuilder_admin'));
commit;
