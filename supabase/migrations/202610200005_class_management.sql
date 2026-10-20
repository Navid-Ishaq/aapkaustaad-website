begin;
create function public.chat_class_delete_preview(p_actor uuid,p_class uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.chat_classes;n bigint;k bigint;
begin
 perform chat_private.require_owner(p_actor);
 select * into c from public.chat_classes where id=p_class;
 if not found then raise exception 'Class not found';end if;
 select count(*) into n from public.chat_messages where class_id=p_class;
 select count(*) into k from public.chat_memberships where class_id=p_class;
 return jsonb_build_object('class_id',c.id,'class_name',c.name,'count',n,'members',k,'revision',c.history_revision);
end $$;
create function public.chat_class_delete_execute(p_actor uuid,p_class uuid,p_name text,p_count bigint,p_members bigint,p_revision bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare preview jsonb;
begin
 perform chat_private.require_owner(p_actor);
 perform 1 from public.chat_classes where id=p_class for update;
 preview=public.chat_class_delete_preview(p_actor,p_class);
 if p_name is distinct from preview->>'class_name' or p_count is distinct from (preview->>'count')::bigint or p_members is distinct from (preview->>'members')::bigint or p_revision is distinct from (preview->>'revision')::bigint then raise exception 'Class changed. Preview deletion again.';end if;
 delete from public.chat_messages where class_id=p_class;
 delete from public.chat_classes where id=p_class;
 insert into public.chat_admin_audit(actor_id,action,target) values(p_actor,'delete-class',p_class::text||':messages='||p_count::text);
 return jsonb_build_object('class_id',p_class,'deleted_count',p_count);
end $$;
revoke all on function public.chat_class_delete_preview(uuid,uuid),public.chat_class_delete_execute(uuid,uuid,text,bigint,bigint,bigint) from public,anon,authenticated;
grant execute on function public.chat_class_delete_preview(uuid,uuid),public.chat_class_delete_execute(uuid,uuid,text,bigint,bigint,bigint) to service_role;
notify pgrst,'reload schema';
commit;
