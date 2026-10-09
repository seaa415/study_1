create schema if not exists private;
grant usage on schema private to anon, authenticated;
-- Supabase SQL Editor에서 한 번 실행합니다. 이 스키마는 새 배포용입니다.
create table if not exists public.records (
 id text primary key,
 kind text not null check (kind in ('member','project','resource','event','goal','comment','version','feedback','teamGoal','rules')),
 data jsonb not null check (jsonb_typeof(data)='object' and octet_length(data::text)<=30000 and jsonb_typeof(data->'title')='string' and length(trim(data->>'title')) between 1 and 150),
 owner uuid not null references auth.users(id),
 visibility text not null default 'shared' check (visibility in ('shared','private')),
 parent text references public.records(id) on delete cascade,
 updated timestamptz not null default now(),
 check (kind <> 'member' or (id='profile_'||owner::text and length(data->>'title')<=24)),
 check (kind <> 'teamGoal' or id='team-goal'),
 check (kind <> 'rules' or id='study-rules'),
 check (kind not in ('member','event','teamGoal','rules') or (visibility='shared' and parent is null)),
 check (kind not in ('comment','version') or parent is not null)
);
create index if not exists records_parent_idx on public.records(parent);
create index if not exists records_owner_idx on public.records(owner);
create unique index if not exists one_profile_per_user on public.records(owner) where kind='member';
create table if not exists public.uploads (
 id uuid primary key,
 owner uuid not null references auth.users(id),
 path text not null unique,
 filename text not null check (length(filename) between 1 and 255),
 created timestamptz not null default now(),
 check (path=owner::text||'/'||id::text)
);
alter table public.records enable row level security;
alter table public.uploads enable row level security;

create or replace function private.can_read_record(record_id text) returns boolean
 language sql stable security definer set search_path='' as $$
 with recursive ancestors as (
  select r.id,r.owner,r.visibility,r.parent,array[r.id] as path from public.records r where r.id=record_id
  union all
  select r.id,r.owner,r.visibility,r.parent,a.path||r.id from public.records r join ancestors a on r.id=a.parent where not r.id=any(a.path)
 )
 select exists(select 1 from ancestors where parent is null)
  and coalesce((select bool_and(visibility='shared' or coalesce(owner=(select auth.uid()),false)) from ancestors),false);
$$;
create or replace function private.has_profile() returns boolean
 language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.records where kind='member' and owner=(select auth.uid()));
$$;
create or replace function private.can_read_file(file_id uuid) returns boolean
 language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.uploads u where u.id=file_id and
  (u.owner=(select auth.uid()) or exists(
   select 1 from public.records r where r.owner=u.owner and (r.data->>'url'='/api/files?key='||u.id::text or r.data->>'coverUrl'='/api/files?key='||u.id::text) and private.can_read_record(r.id)
  )));
$$;
create or replace function private.can_read_storage(object_path text) returns boolean
 language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.uploads u where u.path=object_path and private.can_read_file(u.id));
$$;

create or replace function private.guard_record_write() returns trigger
 language plpgsql security definer set search_path='' as $$
 declare p public.records; f uuid; link text;
 begin
  if auth.uid() is null or new.owner is distinct from auth.uid() then raise exception 'Unauthenticated or wrong owner'; end if;
  if tg_op='UPDATE' then
   if old.id<>new.id or old.kind<>new.kind or old.parent is distinct from new.parent then raise exception 'Identity and parent are immutable'; end if;
   if old.kind not in ('teamGoal','rules') and old.owner is distinct from new.owner then raise exception 'Owner is immutable'; end if;
  end if;
  if new.kind<>'member' and not private.has_profile() then raise exception 'Profile required'; end if;
  if new.kind in ('project','teamGoal') then
   if jsonb_typeof(new.data->'progress') is distinct from 'number' or (new.data->>'progress')::numeric not between 0 and 100 then raise exception 'Progress must be 0-100'; end if;
  end if;
  if new.parent is not null then
   if new.parent=new.id then raise exception 'Self-parent forbidden'; end if;
   select * into p from public.records where id=new.parent;
   if p.id is null or not private.can_read_record(p.id) then raise exception 'Inaccessible parent'; end if;
   if new.kind='version' and (p.kind<>'project' or p.owner<>auth.uid()) then raise exception 'Versions belong to the script owner'; end if;
  end if;
  for link in select jsonb_array_elements_text(jsonb_build_array(new.data->>'url',new.data->>'coverUrl')) loop
  if link is not null and link<>'' then
   if link like '/api/files?key=%' then
    begin f:=substring(link from 16)::uuid; exception when others then raise exception 'Invalid file link'; end;
    if not exists(select 1 from public.uploads where id=f and owner=auth.uid()) then raise exception 'Only own uploads may be attached'; end if;
   elsif link !~ '^https?://' then raise exception 'Invalid document URL'; end if;
  end if;
  end loop;
  new.updated:=now();
  return new;
 end;
$$;
drop trigger if exists guard_record_write on public.records;
create trigger guard_record_write before insert or update on public.records for each row execute function private.guard_record_write();

-- 같은 SQL을 재실행해도 기존 데이터를 삭제하지 않습니다.
drop policy if exists records_read on public.records;
create policy records_read on public.records for select to anon,authenticated using ((parent is null and (visibility='shared' or owner=(select auth.uid()))) or private.can_read_record(id));
drop policy if exists records_insert on public.records;
create policy records_insert on public.records for insert to authenticated with check (owner=(select auth.uid()) and (kind='member' or private.has_profile()));
drop policy if exists records_update on public.records;
create policy records_update on public.records for update to authenticated
 using ((owner=(select auth.uid()) or kind in ('teamGoal','rules')) and (kind='member' or private.has_profile()))
 with check (owner=(select auth.uid()) and (kind='member' or private.has_profile()));
drop policy if exists records_delete on public.records;
create policy records_delete on public.records for delete to authenticated using (owner=(select auth.uid()) and kind not in ('member','teamGoal','rules'));
drop policy if exists uploads_read on public.uploads;
create policy uploads_read on public.uploads for select to anon,authenticated using (private.can_read_file(id));
drop policy if exists uploads_insert on public.uploads;
create policy uploads_insert on public.uploads for insert to authenticated with check (owner=(select auth.uid()) and private.has_profile());

grant select on public.records,public.uploads to anon;
grant select,insert,update,delete on public.records to authenticated;
grant select,insert on public.uploads to authenticated;
revoke all on function private.can_read_record(text),private.can_read_file(uuid),private.can_read_storage(text),private.has_profile() from public;
grant execute on function private.can_read_record(text),private.can_read_file(uuid),private.can_read_storage(text),private.has_profile() to anon,authenticated;
revoke all on function private.guard_record_write() from public;

insert into storage.buckets(id,name,public,file_size_limit) values ('study-files','study-files',false,10485760)
 on conflict (id) do update set public=false,file_size_limit=10485760;
drop policy if exists study_files_insert on storage.objects;
create policy study_files_insert on storage.objects for insert to authenticated with check (
 bucket_id='study-files' and (storage.foldername(name))[1]=(select auth.uid())::text and private.has_profile()
);
drop policy if exists study_files_read on storage.objects;
create policy study_files_read on storage.objects for select to anon,authenticated using (bucket_id='study-files' and private.can_read_storage(name));
create or replace function public.record_room_visit() returns void language sql security invoker set search_path='' as $$ update public.records set data=jsonb_set(data,'{lastVisitedAt}',to_jsonb(now()::text),true) where kind='member' and owner=auth.uid() and (data->>'lastVisitedAt' is null or (data->>'lastVisitedAt')::timestamptz < now()-interval '1 hour'); $$;
revoke all on function public.record_room_visit() from public,anon;
grant execute on function public.record_room_visit() to authenticated;