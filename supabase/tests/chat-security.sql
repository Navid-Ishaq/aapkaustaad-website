-- Run against a disposable local database AFTER the migration. All fixtures roll back.
begin;
create function pg_temp.assert_true(ok boolean,label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL: %',label; end if; raise notice 'PASS: %',label; end $$;
create function pg_temp.denied(statement text,label text) returns void language plpgsql as $$
begin
 begin execute statement; exception when insufficient_privilege or foreign_key_violation then raise notice 'PASS: %',label; return; end;
 raise exception 'FAIL (not denied): %',label;
end $$;
insert into auth.users(id) values
 ('10000000-0000-0000-0000-000000000001'),('10000000-0000-0000-0000-000000000002'),
 ('10000000-0000-0000-0000-000000000003'),('10000000-0000-0000-0000-000000000004'),
 ('10000000-0000-0000-0000-000000000005');
insert into public.chat_profiles(id,display_name,role,must_change_password) values
 ('10000000-0000-0000-0000-000000000001','Alice','student',false),
 ('10000000-0000-0000-0000-000000000002','Bob','student',false),
 ('10000000-0000-0000-0000-000000000003','Teacher','admin',false),
 ('10000000-0000-0000-0000-000000000004','First login','student',true);
insert into public.chat_classes(id,name) values ('20000000-0000-0000-0000-000000000001','Class A'),('20000000-0000-0000-0000-000000000002','Class B');
insert into public.chat_memberships(class_id,user_id) values
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001'),
 ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002'),
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000004');
insert into public.chat_messages(class_id,author_id,author_name,body,created_at) values
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000003','Teacher','Class A secret',now()-interval '1 hour'),
 ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000003','Teacher','Class B secret',now()-interval '1 hour');

set local role anon;
select pg_temp.denied('select * from public.chat_messages','anonymous cannot read messages');
select pg_temp.denied($q$select public.chat_send_message('20000000-0000-0000-0000-000000000001','spam')$q$,'anonymous cannot send');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select pg_temp.assert_true((select count(*)=1 from public.chat_classes),'student sees only assigned class');
select pg_temp.assert_true((select count(*)=1 from public.chat_messages),'student sees only own class history');
select pg_temp.assert_true((select count(*)=1 from public.chat_profiles),'other student profiles are private');
select pg_temp.denied($q$update public.chat_profiles set role='admin'$q$,'student cannot promote self');
select pg_temp.denied($q$insert into public.chat_memberships values('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001')$q$,'student cannot self-enrol');
select pg_temp.denied($q$insert into public.chat_messages(class_id,author_id,author_name,body) values('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000003','Teacher','forged')$q$,'direct message inserts denied');
select pg_temp.denied($q$select public.chat_send_message('20000000-0000-0000-0000-000000000002','intrusion')$q$,'cross-class send denied');
select pg_temp.denied($q$select public.chat_send_message('20000000-0000-0000-0000-000000000001','fake announcement',null,true)$q$,'student announcements denied');
select pg_temp.denied(format('select public.chat_send_message(%L,%L,%s)', '20000000-0000-0000-0000-000000000001','cross reply',(select max(id) from public.chat_messages)+1),'cross-class reply denied');
select pg_temp.assert_true((public.chat_send_message('20000000-0000-0000-0000-000000000001','Hello class')).author_name='Alice','sender identity is server assigned');
do $$begin
 begin perform public.chat_send_message('20000000-0000-0000-0000-000000000001','too fast'); exception when others then
 if sqlerrm like '%two seconds%' then raise notice 'PASS: message rate limited'; return; end if; raise;
 end; raise exception 'FAIL: rate limit';
end $$;
reset role;
delete from public.chat_memberships where user_id='10000000-0000-0000-0000-000000000001';
set local role authenticated;
select pg_temp.assert_true((select count(*)=0 from public.chat_messages),'removed member loses history with existing JWT');
select pg_temp.denied($q$select public.chat_send_message('20000000-0000-0000-0000-000000000001','removed')$q$,'removed member cannot send');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000004',true);
select pg_temp.assert_true((select count(*)=0 from public.chat_messages),'first login cannot read before password change');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000005',true);
select pg_temp.assert_true((select count(*)=0 from public.chat_messages),'unprovisioned Auth user cannot read');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
select pg_temp.assert_true((select count(*)=2 from public.chat_classes),'admin sees all classes');
select pg_temp.assert_true((public.chat_send_message('20000000-0000-0000-0000-000000000002','Teacher notice',null,true)).announcement,'admin can announce');
reset role;
update public.chat_profiles set active=false where id='10000000-0000-0000-0000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
select pg_temp.assert_true((select count(*)=0 from public.chat_messages),'revoked account loses access with existing JWT');
select pg_temp.denied($q$select public.chat_send_message('20000000-0000-0000-0000-000000000002','revoked')$q$,'revoked account cannot send');
reset role;
update public.chat_classes set archived=true where id='20000000-0000-0000-0000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
select pg_temp.denied($q$select public.chat_send_message('20000000-0000-0000-0000-000000000002','archived')$q$,'archived class cannot receive messages');
reset role;
rollback;
