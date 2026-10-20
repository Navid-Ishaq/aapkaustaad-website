-- Run in a disposable database after owner migration (with its owner fixture installed).
begin;
create function pg_temp.assert_ok(ok boolean,label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL: %',label; end if; raise notice 'PASS: %',label; end $$;
create function pg_temp.must_deny(statement text,label text) returns void language plpgsql as $$
begin begin execute statement; exception when insufficient_privilege then raise notice 'PASS: %',label; return; end; raise exception 'FAIL: %',label; end $$;
set local role authenticated;
select pg_temp.must_deny('select * from chat_private.chat_owner','browser cannot read protected owner table');
select pg_temp.must_deny('select public.chat_owner_id()','browser cannot invoke service-only owner lookup');
select pg_temp.must_deny($q$update public.chat_profiles set role='admin'$q$,'browser cannot grant admin rights');
reset role;
set local role anon;
select pg_temp.must_deny('select public.chat_owner_id()','anonymous cannot resolve owner');
reset role;
set local role service_role;
select pg_temp.assert_ok(public.chat_owner_id() is not null,'Edge Functions can resolve existing owner');
select pg_temp.must_deny($q$update public.chat_profiles set active=false where id=public.chat_owner_id()$q$,'owner cannot be deactivated even through profile service writes');
select pg_temp.must_deny($q$update public.chat_profiles set role='student' where id=public.chat_owner_id()$q$,'owner cannot be demoted');
select pg_temp.must_deny($q$delete from public.chat_profiles where id=public.chat_owner_id()$q$,'owner profile cannot be deleted');
select pg_temp.must_deny('delete from chat_private.chat_owner','service role cannot overwrite owner registry');
reset role;
rollback;
