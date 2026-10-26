-- Growth Tracker cloud schema (Supabase / Postgres)
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to re-run: objects are created with IF NOT EXISTS / CREATE OR REPLACE.
--
-- Design:
--   * Clients can only READ their own rows. All writes go through SECURITY DEFINER
--     functions below that validate and clamp input.
--   * Passwords are never stored by us: Supabase Auth (auth.users) manages them.
--   * Leaderboard data is public only for people who opted in.

-- ───────────── tables ─────────────

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar text not null default '🙂' check (char_length(avatar) <= 8),
  country text check (country is null or country ~ '^[A-Z]{2}$'),
  leaderboard_opt_in boolean not null default false,
  hidden boolean not null default false, -- set by the admin to remove someone from the board
  created_at timestamptz not null default now(),
  constraint display_name_format check (display_name ~ '^[A-Za-z0-9_.-][A-Za-z0-9_. -]{1,22}[A-Za-z0-9_.-]$')
);
create unique index if not exists profiles_display_name_key on public.profiles (lower(display_name));

create table if not exists public.daily_activity (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  focus_minutes int not null default 0 check (focus_minutes between 0 and 720),
  topics_passed int not null default 0 check (topics_passed between 0 and 20),
  problems_logged int not null default 0 check (problems_logged between 0 and 50),
  cards_reviewed int not null default 0 check (cards_reviewed between 0 and 500),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);
create index if not exists daily_activity_day_idx on public.daily_activity (day);

create table if not exists public.backups (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data text not null check (octet_length(data) <= 1500000), -- hard size cap per person
  encrypted boolean not null default false,
  revision int not null default 1,
  device text,
  updated_at timestamptz not null default now()
);

-- One safety-net copy: the largest recent version, so an accidental overwrite with a tiny/empty
-- backup can be undone with restore_previous_backup().
alter table public.backups
  add column if not exists prev_data text check (prev_data is null or octet_length(prev_data) <= 1500000),
  add column if not exists prev_encrypted boolean,
  add column if not exists prev_revision int,
  add column if not exists prev_updated_at timestamptz;

-- ───────────── row level security ─────────────

alter table public.profiles enable row level security;
alter table public.daily_activity enable row level security;
alter table public.backups enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles for select to authenticated using (user_id = auth.uid());
drop policy if exists "read own activity" on public.daily_activity;
create policy "read own activity" on public.daily_activity for select to authenticated using (user_id = auth.uid());
drop policy if exists "read own backup" on public.backups;
create policy "read own backup" on public.backups for select to authenticated using (user_id = auth.uid());

-- no insert/update/delete policies: writes are only possible through the functions below
revoke all on public.profiles, public.daily_activity, public.backups from anon, authenticated;
grant select on public.profiles, public.daily_activity, public.backups to authenticated;

-- ───────────── write functions ─────────────

create or replace function public.upsert_profile(
  p_name text,
  p_avatar text default '🙂',
  p_country text default null,
  p_opt_in boolean default false
) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  insert into public.profiles (user_id, display_name, avatar, country, leaderboard_opt_in)
  values (uid, trim(p_name), coalesce(nullif(p_avatar, ''), '🙂'), nullif(upper(trim(p_country)), ''), coalesce(p_opt_in, false))
  on conflict (user_id) do update
    set display_name = excluded.display_name,
        avatar = excluded.avatar,
        country = excluded.country,
        leaderboard_opt_in = excluded.leaderboard_opt_in;
  -- opting out removes the daily totals that were only stored for the leaderboard
  if not coalesce(p_opt_in, false) then
    delete from public.daily_activity where user_id = uid;
  end if;
end $$;

-- Optimistic-concurrency backup push. Returns the new revision, or raises 'conflict'.
create or replace function public.push_backup(
  p_data text,
  p_encrypted boolean,
  p_expected_revision int,
  p_device text default null
) returns int
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  cur int;
  last_at timestamptz;
  old_data text;
  old_enc boolean;
  old_prev_data text;
  old_prev_at timestamptz;
  keep_prev boolean;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select revision, updated_at, data, encrypted, prev_data, prev_updated_at
    into cur, last_at, old_data, old_enc, old_prev_data, old_prev_at
    from public.backups where user_id = uid for update;
  if cur is null then
    insert into public.backups (user_id, data, encrypted, revision, device)
    values (uid, p_data, coalesce(p_encrypted, false), 1, left(p_device, 60));
    return 1;
  end if;
  if p_expected_revision is distinct from cur then
    raise exception 'conflict' using errcode = 'P0001';
  end if;
  if last_at > now() - interval '3 seconds' then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  -- keep the largest version of the last 7 days as the undo copy (normal growth just moves it along)
  keep_prev := old_prev_data is null
            or old_prev_at < now() - interval '7 days'
            or octet_length(old_data) >= octet_length(old_prev_data);
  update public.backups
     set prev_data = case when keep_prev then old_data else prev_data end,
         prev_encrypted = case when keep_prev then old_enc else prev_encrypted end,
         prev_revision = case when keep_prev then cur else prev_revision end,
         prev_updated_at = case when keep_prev then last_at else prev_updated_at end,
         data = p_data, encrypted = coalesce(p_encrypted, false), revision = cur + 1,
         device = left(p_device, 60), updated_at = now()
   where user_id = uid;
  return cur + 1;
end $$;

-- Daily leaderboard numbers. Only for opted-in people. Values are clamped, not trusted.
-- Days older than 3 days are insert-only (first sync can backfill history, later edits are ignored).
create or replace function public.sync_daily(p_rows jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  r jsonb;
  d date;
  n int := 0;
  fm int; tp int; pl int; cr int;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not exists (select 1 from public.profiles where user_id = uid and leaderboard_opt_in) then
    raise exception 'not_opted_in' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 400 then
    raise exception 'bad_rows' using errcode = 'P0001';
  end if;
  for r in select * from jsonb_array_elements(p_rows) loop
    d := (r ->> 'day')::date;
    if d > current_date + 1 or d < current_date - 400 then continue; end if;
    fm := least(greatest(coalesce((r ->> 'focus_minutes')::int, 0), 0), 720);
    tp := least(greatest(coalesce((r ->> 'topics_passed')::int, 0), 0), 20);
    pl := least(greatest(coalesce((r ->> 'problems_logged')::int, 0), 0), 50);
    cr := least(greatest(coalesce((r ->> 'cards_reviewed')::int, 0), 0), 500);
    if d >= current_date - 3 then
      insert into public.daily_activity (user_id, day, focus_minutes, topics_passed, problems_logged, cards_reviewed)
      values (uid, d, fm, tp, pl, cr)
      on conflict (user_id, day) do update
        set focus_minutes = excluded.focus_minutes, topics_passed = excluded.topics_passed,
            problems_logged = excluded.problems_logged, cards_reviewed = excluded.cards_reviewed,
            updated_at = now();
    else
      insert into public.daily_activity (user_id, day, focus_minutes, topics_passed, problems_logged, cards_reviewed)
      values (uid, d, fm, tp, pl, cr)
      on conflict (user_id, day) do nothing;
    end if;
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function public.restore_previous_backup() returns int
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  b public.backups%rowtype;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select * into b from public.backups where user_id = uid for update;
  if b.user_id is null or b.prev_data is null then raise exception 'no_previous_backup' using errcode = 'P0001'; end if;
  update public.backups
     set data = b.prev_data, encrypted = coalesce(b.prev_encrypted, false), revision = b.revision + 1,
         prev_data = b.data, prev_encrypted = b.encrypted, prev_revision = b.revision, prev_updated_at = b.updated_at,
         device = 'restore', updated_at = now()
   where user_id = uid;
  return b.revision + 1;
end $$;

create or replace function public.delete_my_cloud_data() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  delete from public.backups where user_id = auth.uid();
  delete from public.daily_activity where user_id = auth.uid();
end $$;

create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  delete from auth.users where id = auth.uid(); -- cascades to every table above
end $$;

-- ───────────── leaderboard ─────────────
-- Score per day = topics_passed*10 + focus_hours*2 (max 8h) + problems*3 (max 10) + cards*0.2 (max 50)
-- plus an active-day bonus: 1 point per active day (max 30) in the period.

create or replace function public._leaderboard_all(p_period text)
returns table (rank bigint, display_name text, avatar text, country text, score numeric, active_days int, is_me boolean)
language sql stable security definer set search_path = public as $$
  with w as (
    select case p_period
             when 'week' then current_date - 6
             when 'month' then current_date - 29
             else date '1970-01-01'
           end as since
  ), per_user as (
    select p.user_id, p.display_name, p.avatar, p.country,
           (count(*) filter (where d.focus_minutes > 0 or d.topics_passed > 0 or d.problems_logged > 0 or d.cards_reviewed > 0))::int as active_days,
           sum(d.topics_passed * 10
               + least(d.focus_minutes, 480) / 60.0 * 2
               + least(d.problems_logged, 10) * 3
               + least(d.cards_reviewed, 50) * 0.2)::numeric as raw
    from public.profiles p
    join public.daily_activity d on d.user_id = p.user_id
    cross join w
    where p.leaderboard_opt_in and not p.hidden and d.day >= w.since
    group by p.user_id, p.display_name, p.avatar, p.country
  ), scored as (
    select *, round(raw + least(active_days, 30), 1) as score from per_user
  )
  select (rank() over (order by score desc, display_name))::bigint,
         display_name, avatar, country, score, active_days,
         coalesce(user_id = auth.uid(), false) as is_me
  from scored
$$;

create or replace function public.leaderboard(p_period text default 'week', p_limit int default 100)
returns table (rank bigint, display_name text, avatar text, country text, score numeric, active_days int, is_me boolean)
language sql stable security definer set search_path = public as $$
  select * from public._leaderboard_all(p_period) order by rank, display_name limit least(greatest(p_limit, 1), 200)
$$;

create or replace function public.my_rank(p_period text default 'week')
returns table (rank bigint, display_name text, avatar text, country text, score numeric, active_days int, is_me boolean)
language sql stable security definer set search_path = public as $$
  select * from public._leaderboard_all(p_period) where is_me
$$;

-- ───────────── permissions ─────────────

revoke all on function public.upsert_profile(text, text, text, boolean) from public, anon, authenticated;
revoke all on function public.push_backup(text, boolean, int, text) from public, anon, authenticated;
revoke all on function public.sync_daily(jsonb) from public, anon, authenticated;
revoke all on function public.restore_previous_backup() from public, anon, authenticated;
revoke all on function public.delete_my_cloud_data() from public, anon, authenticated;
revoke all on function public.delete_my_account() from public, anon, authenticated;
revoke all on function public._leaderboard_all(text) from public, anon, authenticated;
revoke all on function public.leaderboard(text, int) from public, anon, authenticated;
revoke all on function public.my_rank(text) from public, anon, authenticated;

grant execute on function public.upsert_profile(text, text, text, boolean) to authenticated;
grant execute on function public.push_backup(text, boolean, int, text) to authenticated;
grant execute on function public.sync_daily(jsonb) to authenticated;
grant execute on function public.restore_previous_backup() to authenticated;
grant execute on function public.delete_my_cloud_data() to authenticated;
grant execute on function public.delete_my_account() to authenticated;
grant execute on function public.my_rank(text) to authenticated;
-- the public leaderboard can be read by anyone (guests included)
grant execute on function public.leaderboard(text, int) to anon, authenticated;

-- ───────────── hardening: social sign-in only ─────────────
-- The app offers GitHub and Google sign-in only. As a server-side backstop (independent of the
-- dashboard's Email provider switch), reject any new account created through email/password.
-- If you later want email sign-in, run: drop trigger block_email_signups on auth.users;

create or replace function public.block_email_signups() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.raw_app_meta_data ->> 'provider', '') = 'email' then
    raise exception 'Email sign-up is disabled. Please use GitHub or Google.' using errcode = 'P0001';
  end if;
  return new;
end $$;

revoke all on function public.block_email_signups() from public, anon, authenticated;

drop trigger if exists block_email_signups on auth.users;
create trigger block_email_signups before insert on auth.users
  for each row execute function public.block_email_signups();
