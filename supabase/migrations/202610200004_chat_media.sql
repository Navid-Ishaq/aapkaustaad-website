begin;
alter table public.chat_classes add column teacher_voice boolean not null default false,add column student_voice boolean not null default false,add column image_upload boolean not null default false;
alter table public.chat_messages add column attachments jsonb not null default '[]'::jsonb check(jsonb_typeof(attachments)='array' and jsonb_array_length(attachments)<=5);
-- Media-only messages carry an empty text caption; text RPC still enforces nonempty text.
alter table public.chat_messages drop constraint chat_messages_body_check;
alter table public.chat_messages add constraint chat_messages_body_check check(char_length(body)<=2000 and (char_length(btrim(body))>0 or jsonb_array_length(attachments)>0));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('alnoor-chat-media','alnoor-chat-media',false,4194304,array['image/jpeg','audio/wav']);
create table public.chat_media_gc(path text primary key,not_before timestamptz not null default now());
alter table public.chat_media_gc enable row level security;
revoke all on public.chat_media_gc from public,anon,authenticated;
grant all on public.chat_media_gc to service_role;
create function chat_private.media_read(object_path text) returns boolean language sql stable security definer set search_path='' as $$
select exists(select 1 from public.chat_messages m where chat_private.can_chat(m.class_id) and exists(select 1 from jsonb_array_elements(m.attachments) a where a->>'path'=object_path));
$$;
revoke all on function chat_private.media_read(text) from public,anon;
grant execute on function chat_private.media_read(text) to authenticated;
create policy chat_media_read on storage.objects for select to authenticated using(bucket_id='alnoor-chat-media' and chat_private.media_read(name));
-- No browser INSERT/UPDATE/DELETE policy: all uploads pass server decoding and permission checks.
create function chat_private.queue_deleted_media() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.chat_media_gc(path) select a->>'path' from jsonb_array_elements(old.attachments) a on conflict(path) do update set not_before=now();
 return old;
end $$;
create trigger queue_deleted_media after delete on public.chat_messages for each row execute function chat_private.queue_deleted_media();
revoke all on function chat_private.queue_deleted_media() from public,anon,authenticated;
create function public.chat_publish_media(p_actor uuid,p_class uuid,p_body text,p_files jsonb,p_reply bigint default null,p_announcement boolean default false) returns public.chat_messages language plpgsql security definer set search_path='' as $$
declare p public.chat_profiles;c public.chat_classes;f jsonb;r public.chat_messages;kind text;
begin
 select * into p from public.chat_profiles where id=p_actor for update;
 select * into c from public.chat_classes where id=p_class for share;
 if p.id is null or c.id is null or not p.active or p.must_change_password or c.archived or (p.role<>'admin' and not exists(select 1 from public.chat_memberships where user_id=p.id and class_id=c.id)) then raise exception 'Class access denied' using errcode='42501';end if;
 if p_announcement and p.role<>'admin' then raise exception 'Teacher required' using errcode='42501';end if;
 if jsonb_typeof(p_files)<>'array' or jsonb_array_length(p_files) not between 1 and 5 or p_body is null or char_length(p_body)>2000 then raise exception 'Invalid media message';end if;
 kind=p_files->0->>'kind';
 if kind not in ('image','voice') or (kind='voice' and (jsonb_array_length(p_files)<>1 or not(case when p.role='admin' then c.teacher_voice else c.student_voice end))) or (kind='image' and not c.image_upload) then raise exception 'Media disabled for this class' using errcode='42501';end if;
 for f in select * from jsonb_array_elements(p_files) loop
 if f->>'kind' is distinct from kind or f->>'path' not like c.id::text||'/'||p.id::text||'/%' or (f->>'size')::int not between 1 and 4194304 or (kind='voice' and ((f->>'duration')::numeric not between 0.01 and 120 or f->>'mime'<>'audio/wav')) or (kind='image' and f->>'mime'<>'image/jpeg') then raise exception 'Invalid attachment';end if;
 if not exists(select 1 from storage.objects where bucket_id='alnoor-chat-media' and name=f->>'path') then raise exception 'Media file missing';end if;
 end loop;
 if exists(select 1 from public.chat_messages where author_id=p.id and created_at>clock_timestamp()-interval '2 seconds') then raise exception 'Please wait two seconds between messages';end if;
 insert into public.chat_messages(class_id,author_id,author_name,body,reply_to,announcement,attachments) values(c.id,p.id,p.display_name,btrim(p_body),p_reply,p_announcement,p_files) returning * into r;
 delete from public.chat_media_gc where path in(select a->>'path' from jsonb_array_elements(p_files) a);
 return r;
end $$;
revoke all on function public.chat_publish_media(uuid,uuid,text,jsonb,bigint,boolean) from public,anon,authenticated;
grant execute on function public.chat_publish_media(uuid,uuid,text,jsonb,bigint,boolean) to service_role;
notify pgrst,'reload schema';
commit;
