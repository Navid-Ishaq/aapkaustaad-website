begin;
create schema if not exists chat_private;
revoke all on schema chat_private from public, anon, authenticated;
grant usage on schema chat_private to authenticated;

create table public.chat_profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check(char_length(btrim(display_name)) between 1 and 80),
 role text not null default 'student' check(role in ('student','admin')),
 active boolean not null default true,
 must_change_password boolean not null default true,
 created_at timestamptz not null default now()
);
create table public.chat_classes (
 id uuid primary key default gen_random_uuid(),
 name text not null check(char_length(btrim(name)) between 1 and 100),
 archived boolean not null default false,
 created_at timestamptz not null default now()
);
create table public.chat_memberships (
 class_id uuid references public.chat_classes(id) on delete cascade,
 user_id uuid references public.chat_profiles(id) on delete cascade,
 primary key(class_id,user_id)
);
create index chat_memberships_user on public.chat_memberships(user_id,class_id);
create table public.chat_messages (
 id bigint generated always as identity primary key,
 class_id uuid not null references public.chat_classes(id),
 author_id uuid not null references public.chat_profiles(id),
 author_name text not null,
 body text not null check(char_length(btrim(body)) between 1 and 2000),
 announcement boolean not null default false,
 reply_to bigint,
 created_at timestamptz not null default clock_timestamp(),
 unique(id,class_id),
 foreign key(reply_to,class_id) references public.chat_messages(id,class_id)
);
create index chat_messages_history on public.chat_messages(class_id,id desc);
create index chat_messages_rate on public.chat_messages(author_id,created_at desc);
create table public.chat_admin_audit (
 id bigint generated always as identity primary key,
 actor_id uuid not null references auth.users(id),
 action text not null,
 target text,
 created_at timestamptz not null default now()
);

create function chat_private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.chat_profiles where id=auth.uid() and active and not must_change_password and role='admin');
$$;
create function chat_private.can_chat(cid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.chat_profiles p join public.chat_classes c on c.id=cid
 where p.id=auth.uid() and p.active and not p.must_change_password and not c.archived
 and (p.role='admin' or exists(select 1 from public.chat_memberships m where m.user_id=p.id and m.class_id=cid)));
$$;
revoke all on all functions in schema chat_private from public,anon;
grant execute on all functions in schema chat_private to authenticated;

alter table public.chat_profiles enable row level security;
alter table public.chat_classes enable row level security;
alter table public.chat_memberships enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_admin_audit enable row level security;
revoke all on public.chat_profiles,public.chat_classes,public.chat_memberships,public.chat_messages,public.chat_admin_audit from anon,authenticated;
grant select on public.chat_profiles,public.chat_classes,public.chat_memberships,public.chat_messages to authenticated;
grant all on public.chat_profiles,public.chat_classes,public.chat_memberships,public.chat_messages,public.chat_admin_audit to service_role;
grant usage,select on all sequences in schema public to service_role;
create policy profile_read on public.chat_profiles for select to authenticated using(id=auth.uid() or chat_private.is_admin());
create policy class_read on public.chat_classes for select to authenticated using(chat_private.is_admin() or chat_private.can_chat(id));
create policy membership_read on public.chat_memberships for select to authenticated using(chat_private.is_admin() or (user_id=auth.uid() and chat_private.can_chat(class_id)));
create policy message_read on public.chat_messages for select to authenticated using(chat_private.can_chat(class_id));

-- Sole message write path. Never trust sender IDs, names or announcement roles from browsers.
create function public.chat_send_message(p_class_id uuid,p_body text,p_reply_to bigint default null,p_announcement boolean default false)
returns public.chat_messages language plpgsql security definer set search_path='' as $$
declare p public.chat_profiles; result public.chat_messages;
begin
 select * into p from public.chat_profiles where id=auth.uid() for update;
 if not chat_private.can_chat(p_class_id) then raise exception 'Class access denied' using errcode='42501'; end if;
 if p_announcement and p.role<>'admin' then raise exception 'Administrator required' using errcode='42501'; end if;
 if p_body is null or char_length(btrim(p_body)) not between 1 and 2000 then raise exception 'Message must contain 1–2000 characters'; end if;
 if exists(select 1 from public.chat_messages where author_id=p.id and created_at>clock_timestamp()-interval '2 seconds') then raise exception 'Please wait two seconds between messages'; end if;
 insert into public.chat_messages(class_id,author_id,author_name,body,reply_to,announcement)
 values(p_class_id,p.id,p.display_name,btrim(p_body),p_reply_to,p_announcement) returning * into result;
 return result;
end;
$$;
revoke all on function public.chat_send_message(uuid,text,bigint,boolean) from public,anon;
grant execute on function public.chat_send_message(uuid,text,bigint,boolean) to authenticated;

do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='chat_messages') then
 alter publication supabase_realtime add table public.chat_messages;
 end if;
end $$;
commit;
