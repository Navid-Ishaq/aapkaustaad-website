-- Apply after 202610200001. Promotes only Naveed's existing administrator account.
begin;
create table chat_private.chat_owner (
 singleton boolean primary key default true check(singleton),
 user_id uuid not null unique references public.chat_profiles(id)
);
alter table chat_private.chat_owner enable row level security;
revoke all on chat_private.chat_owner from public,anon,authenticated,service_role;
do $$
declare owner_uid uuid;
begin
 select p.id into owner_uid from public.chat_profiles p join auth.users u on u.id=p.id
 where lower(u.email)='mnvid@hotmail.com' and p.role='admin' and p.active;
 if owner_uid is null then raise exception 'Naveed administrator (mnvid@hotmail.com) not found. No changes applied.'; end if;
 insert into chat_private.chat_owner(singleton,user_id) values(true,owner_uid);
end $$;
create function public.chat_owner_id() returns uuid language sql stable security definer set search_path='' as $$
 select user_id from chat_private.chat_owner where singleton;
$$;
revoke all on function public.chat_owner_id() from public,anon,authenticated;
grant execute on function public.chat_owner_id() to service_role;
create function chat_private.protect_owner() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from chat_private.chat_owner where user_id=old.id) then
  if tg_op='DELETE' then raise exception 'Owner account is protected' using errcode='42501'; end if;
  if new.id<>old.id or new.role<>'admin' or not new.active then raise exception 'Owner account is protected' using errcode='42501'; end if;
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end $$;
revoke all on function chat_private.protect_owner() from public,anon,authenticated;
create trigger protect_chat_owner before update or delete on public.chat_profiles for each row execute function chat_private.protect_owner();
commit;
