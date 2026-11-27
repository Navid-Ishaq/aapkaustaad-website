begin;
insert into public.learn_courses(name,code) values ('VTC-Md','VTC-MD'),('Marco-jurídico-TxMd','MJ-TXMD') on conflict(code) do nothing;
insert into public.learn_sections(course_id,name) select id,'General Tests' from public.learn_courses where code in ('VTC-MD','MJ-TXMD') on conflict(course_id,name) do nothing;
commit;
