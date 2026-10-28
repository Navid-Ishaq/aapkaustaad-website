-- Password changes are optional. Keep existing access policies fail-closed.
begin;
alter table public.chat_profiles alter column must_change_password set default false;
-- Existing student/teacher accounts can use their current password without a forced change.
update public.chat_profiles set must_change_password=false where must_change_password;
commit;
