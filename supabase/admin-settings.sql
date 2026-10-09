create schema if not exists private;
create table if not exists private.site_admins (
 email text primary key check (email=lower(email))
);
alter table private.site_admins enable row level security;
revoke all on private.site_admins from anon,authenticated;
create or replace function private.is_site_admin() returns boolean
 language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users u join private.site_admins a on lower(u.email)=a.email
 where u.id=(select auth.uid()) and u.email_confirmed_at is not null);
$$;
revoke all on function private.is_site_admin() from public;
grant usage on schema private to anon,authenticated;
grant execute on function private.is_site_admin() to authenticated;
create table if not exists public.site_settings (
 id text primary key check(id='site'),
 settings jsonb not null check(jsonb_typeof(settings)='object' and settings ?& array['siteName','studyName','tagline','dashboardTitle','theme']
  and length(settings->>'siteName') between 1 and 24
  and length(settings->>'studyName') between 1 and 60
  and length(settings->>'tagline') between 1 and 120
  and length(settings->>'dashboardTitle') between 1 and 60
  and settings->>'theme' in ('lavender','forest','ocean','rose')),
 updated timestamptz not null default now()
);
alter table public.site_settings enable row level security;
revoke all on public.site_settings from anon,authenticated;
grant select on public.site_settings to anon,authenticated;
grant update on public.site_settings to authenticated;
drop policy if exists settings_read on public.site_settings;
create policy settings_read on public.site_settings for select to anon,authenticated using(true);
drop policy if exists settings_update on public.site_settings;
create policy settings_update on public.site_settings for update to authenticated
 using((select private.is_site_admin())) with check((select private.is_site_admin()));
insert into public.site_settings(id,settings) values ('site','{"siteName":"씬룸","studyName":"작가교육원 스터디","tagline":"함께 완성하는 집필실","dashboardTitle":"함께 쓰는, 다음 장면","theme":"lavender"}') on conflict(id) do nothing;
create index if not exists uploads_owner_idx on public.uploads(owner);
