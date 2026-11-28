begin;
-- Date is inclusive in Europe/Madrid. NULL means no default limit for legacy accounts.
alter table public.learn_access add column if not exists expires_on date;
alter table public.learn_settings add column if not exists expiry_enabled boolean not null default true;
update public.learn_settings set inactivity_days=7, auto_block=true where id=true;
create table if not exists public.learn_student_policy (
 user_id uuid primary key references public.chat_profiles(id) on delete cascade,
 default_expires_on date,
 last_learning_at timestamptz not null default now(),
 suspended_at timestamptz
);
alter table public.learn_student_policy enable row level security;
revoke all on public.learn_student_policy from public,anon,authenticated;
grant all on public.learn_student_policy to service_role;
-- Existing accounts are test accounts: no artificial grace period, no invented expiry.
insert into public.learn_student_policy(user_id,last_learning_at)
select p.id, greatest(p.created_at,coalesce(max(a.last_activity),p.created_at),coalesce(max(t.started_at),p.created_at))
from public.chat_profiles p left join lateral (select max(last_activity) last_activity from public.learn_access where user_id=p.id) a on true
left join lateral (select max(started_at) started_at from public.learn_attempts where user_id=p.id) t on true
where p.role='student' group by p.id,p.created_at on conflict do nothing;
-- Serialized check prevents a late login from resetting an already expired inactivity period.
create or replace function public.learn_activity_check(p_user uuid,p_touch boolean default false)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare s public.learn_settings%rowtype; p public.learn_student_policy%rowtype; ts timestamptz;
begin
 if not exists(select 1 from public.chat_profiles where id=p_user and role='student') then raise exception 'Student required'; end if;
 insert into public.learn_student_policy(user_id,last_learning_at) select id,created_at from public.chat_profiles where id=p_user on conflict do nothing;
 select * into strict s from public.learn_settings where id=true;
 select * into strict p from public.learn_student_policy where user_id=p_user for update;
 ts:=clock_timestamp();
 if p.suspended_at is null and s.auto_block and ts>=p.last_learning_at+make_interval(hours=>24*s.inactivity_days) then
  update public.learn_student_policy set suspended_at=ts where user_id=p_user returning * into p;
 elsif p.suspended_at is null and p_touch then
  update public.learn_student_policy set last_learning_at=ts where user_id=p_user returning * into p;
 end if;
 return jsonb_build_object('last_learning_at',p.last_learning_at,'suspended_at',p.suspended_at,'default_expires_on',p.default_expires_on,'inactivity_days',s.inactivity_days,'auto_block',s.auto_block,'expiry_enabled',s.expiry_enabled);
end $$;
revoke all on function public.learn_activity_check(uuid,boolean) from public,anon,authenticated;
grant execute on function public.learn_activity_check(uuid,boolean) to service_role;
notify pgrst,'reload schema';
commit;
