-- Run this once in Supabase SQL Editor to enable shared video generation safely.
-- Limits: 2 starts per user per UTC day and 5 starts across the whole site per UTC day.
create table if not exists public.amoh_video_usage (
  usage_date date not null default (timezone('utc', now())::date),
  user_id uuid not null references auth.users(id) on delete cascade,
  count integer not null default 0 check (count >= 0),
  primary key (usage_date, user_id)
);
create table if not exists public.amoh_video_global_usage (
  usage_date date primary key default (timezone('utc', now())::date),
  count integer not null default 0 check (count >= 0)
);
alter table public.amoh_video_usage enable row level security;
alter table public.amoh_video_global_usage enable row level security;
revoke all on public.amoh_video_usage from anon, authenticated;
revoke all on public.amoh_video_global_usage from anon, authenticated;

create or replace function public.reserve_amoh_video_generation()
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
  today_utc date := timezone('utc', now())::date;
  user_count integer;
  global_count integer;
begin
  if uid is null then
    raise exception 'Sign in required';
  end if;
  insert into public.amoh_video_usage (usage_date, user_id, count)
  values (today_utc, uid, 0)
  on conflict (usage_date, user_id) do nothing;
  insert into public.amoh_video_global_usage (usage_date, count)
  values (today_utc, 0)
  on conflict (usage_date) do nothing;

  -- Serialize quota checks to avoid concurrent requests bypassing limits.
  perform pg_advisory_xact_lock(hashtext('amoh-video-global-' || today_utc::text));
  select count into user_count from public.amoh_video_usage
   where usage_date = today_utc and user_id = uid for update;
  select count into global_count from public.amoh_video_global_usage
   where usage_date = today_utc for update;

  if user_count >= 2 or global_count >= 5 then
    return false;
  end if;
  update public.amoh_video_usage set count = count + 1
   where usage_date = today_utc and user_id = uid;
  update public.amoh_video_global_usage set count = count + 1
   where usage_date = today_utc;
  return true;
end;
$$;
revoke all on function public.reserve_amoh_video_generation() from public, anon;
grant execute on function public.reserve_amoh_video_generation() to authenticated;
