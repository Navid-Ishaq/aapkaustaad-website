begin;
alter table public.chat_classes add column history_revision bigint not null default 0;
alter table public.chat_messages add column reply_deleted boolean not null default false;
create index chat_messages_reply_lookup on public.chat_messages(reply_to,class_id) where reply_to is not null;
alter table public.chat_messages alter column author_id drop not null;
alter table public.chat_messages drop constraint chat_messages_author_id_fkey;
alter table public.chat_messages add constraint chat_messages_author_id_fkey foreign key(author_id) references public.chat_profiles(id) on delete set null;
alter table public.chat_messages drop constraint chat_messages_reply_to_class_id_fkey;
alter table public.chat_messages add constraint chat_messages_reply_to_class_id_fkey foreign key(reply_to,class_id) references public.chat_messages(id,class_id) on delete set null (reply_to);
alter table public.chat_admin_audit alter column actor_id drop not null;
alter table public.chat_admin_audit drop constraint chat_admin_audit_actor_id_fkey;
alter table public.chat_admin_audit add constraint chat_admin_audit_actor_id_fkey foreign key(actor_id) references auth.users(id) on delete set null;

create function chat_private.anonymize_departed_account() returns trigger language plpgsql security definer set search_path='' as $$
begin
 update public.chat_classes set history_revision=history_revision+1 where id in(select class_id from public.chat_messages where author_id=old.id);
 update public.chat_messages set author_name=case when old.role='admin' then 'Former teacher' else 'Former student' end where author_id=old.id;
 return old;
end $$;
create trigger anonymize_departed_account before delete on public.chat_profiles for each row execute function chat_private.anonymize_departed_account();
create function chat_private.mark_deleted_reply() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.reply_to is not null and new.reply_to is null then new.reply_deleted=true; end if;
 return new;
end $$;
create trigger mark_deleted_reply before update of reply_to on public.chat_messages for each row execute function chat_private.mark_deleted_reply();
create function chat_private.history_deleted() returns trigger language plpgsql security definer set search_path='' as $$
begin
 update public.chat_classes set history_revision=history_revision+1 where id in(select distinct class_id from deleted_messages);
 return null;
end $$;
create trigger history_deleted after delete on public.chat_messages referencing old table as deleted_messages for each statement execute function chat_private.history_deleted();

create function chat_private.require_owner(actor uuid) returns void language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from chat_private.chat_owner o join public.chat_profiles p on p.id=o.user_id
 where o.user_id=actor and p.active and p.role='admin' and not p.must_change_password) then
 raise exception 'Owner required' using errcode='42501'; end if;
end $$;
create function public.chat_cleanup_preview(p_actor uuid,p_class uuid,p_before date) returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.chat_classes; cutoff timestamptz; n bigint;
begin
 perform chat_private.require_owner(p_actor);
 if p_before is null or p_before>(now() at time zone 'Europe/Madrid')::date then raise exception 'Choose today or an earlier date'; end if;
 select * into c from public.chat_classes where id=p_class;
 if not found then raise exception 'Class not found'; end if;
 cutoff=p_before::timestamp at time zone 'Europe/Madrid';
 select count(*) into n from public.chat_messages where class_id=p_class and created_at<cutoff;
 return jsonb_build_object('class_id',c.id,'class_name',c.name,'before_date',p_before,'cutoff_at',cutoff,'timezone','Europe/Madrid','count',n,'revision',c.history_revision);
end $$;
create function public.chat_cleanup_execute(p_actor uuid,p_class uuid,p_before date,p_expected_count bigint,p_expected_revision bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare preview jsonb; n bigint;
begin
 perform chat_private.require_owner(p_actor);
 perform 1 from public.chat_classes where id=p_class for update;
 preview=public.chat_cleanup_preview(p_actor,p_class,p_before);
 if (preview->>'count')::bigint is distinct from p_expected_count or (preview->>'revision')::bigint is distinct from p_expected_revision then
 raise exception 'History changed. Preview again before deleting.'; end if;
 delete from public.chat_messages where class_id=p_class and created_at<(preview->>'cutoff_at')::timestamptz;
 get diagnostics n=row_count;
 insert into public.chat_admin_audit(actor_id,action,target) values(p_actor,'cleanup-history',p_class::text||':before='||p_before::text||':count='||n::text);
 return jsonb_build_object('deleted_count',n,'class_id',p_class,'before_date',p_before);
end $$;
revoke all on function public.chat_cleanup_preview(uuid,uuid,date),public.chat_cleanup_execute(uuid,uuid,date,bigint,bigint) from public,anon,authenticated;
grant execute on function public.chat_cleanup_preview(uuid,uuid,date),public.chat_cleanup_execute(uuid,uuid,date,bigint,bigint) to service_role;
revoke all on all functions in schema chat_private from public,anon;
revoke all on function chat_private.anonymize_departed_account(),chat_private.mark_deleted_reply(),chat_private.history_deleted(),chat_private.require_owner(uuid) from authenticated;
notify pgrst, 'reload schema';
commit;
