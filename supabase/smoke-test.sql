-- Live smoke test for a deployed Growth Tracker database.
-- Paste into the Supabase SQL Editor and Run. It creates temporary test users, exercises the
-- real functions as a signed-in user, then deliberately raises an error at the end so that
-- EVERYTHING is rolled back and nothing is left behind.
--
-- Read the result in the error message: "LIVE_TEST_RESULT {...}". Expected values:
--   github_user_insert: ok                       email_user_insert: "Email sign-up is disabled..."
--   first_push_revision: 1                       second_push_revision: 2
--   stale_push: conflict                         rapid_push: rate_limited
--   daily_rows_accepted: 2                       my_rank score: 292.0 (rank 1 on an empty board)
--   own_backup_rows_visible: 1                   other_user_sees_backups: 0, other_user_sees_activity: 0
--   direct_table_insert: permission denied...    backups_after_delete: 0, activity_after_delete: 0

do $$
declare
  uid uuid := gen_random_uuid();
  other uuid := gen_random_uuid();
  res jsonb := '{}'::jsonb;
  r1 int; r2 int; n int; cnt int;
  board jsonb; mine jsonb;
begin
  insert into auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (uid, 'authenticated', 'authenticated', 'live-test-' || uid || '@example.invalid', '{"provider":"github","providers":["github"]}', '{}', now(), now()),
         (other, 'authenticated', 'authenticated', 'live-test-' || other || '@example.invalid', '{"provider":"github","providers":["github"]}', '{}', now(), now());
  res := res || jsonb_build_object('github_user_insert', 'ok');

  begin
    insert into auth.users (id, aud, role, email, raw_app_meta_data, created_at, updated_at)
    values (gen_random_uuid(), 'authenticated', 'authenticated', 'x-' || uid || '@example.invalid', '{"provider":"email"}', now(), now());
    res := res || jsonb_build_object('email_user_insert', 'NOT BLOCKED');
  exception when others then res := res || jsonb_build_object('email_user_insert', sqlerrm);
  end;

  perform set_config('request.jwt.claim.sub', uid::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid::text, 'role', 'authenticated')::text, true);
  set local role authenticated;

  perform public.upsert_profile('Live Test', '🧪', 'IN', true);
  r1 := public.push_backup('gt1.automated-test', true, 0, 'auto-test');
  res := res || jsonb_build_object('first_push_revision', r1);

  reset role;
  update public.backups set updated_at = now() - interval '10 seconds' where user_id = uid;
  set local role authenticated;

  r2 := public.push_backup('gt1.automated-test-2', true, r1, 'auto-test');
  res := res || jsonb_build_object('second_push_revision', r2);

  begin
    perform public.push_backup('gt1.stale', true, r1, 'other-device');
    res := res || jsonb_build_object('stale_push', 'NOT REJECTED');
  exception when others then res := res || jsonb_build_object('stale_push', sqlerrm);
  end;

  begin
    perform public.push_backup('gt1.rapid', true, r2, 'auto-test');
    res := res || jsonb_build_object('rapid_push', 'NOT RATE LIMITED');
  exception when others then res := res || jsonb_build_object('rapid_push', sqlerrm);
  end;

  n := public.sync_daily(jsonb_build_array(
    jsonb_build_object('day', current_date::text, 'focus_minutes', 90, 'topics_passed', 2, 'problems_logged', 3, 'cards_reviewed', 10),
    jsonb_build_object('day', (current_date - 1)::text, 'focus_minutes', 99999, 'topics_passed', 999, 'problems_logged', 999, 'cards_reviewed', 99999)));
  res := res || jsonb_build_object('daily_rows_accepted', n);

  select coalesce(jsonb_agg(to_jsonb(b)), '[]'::jsonb) into board from public.leaderboard('week', 10) b;
  select coalesce(jsonb_agg(to_jsonb(m)), '[]'::jsonb) into mine from public.my_rank('week') m;
  res := res || jsonb_build_object('week_board_for_me', board, 'my_rank', mine);

  select count(*) into cnt from public.backups;
  res := res || jsonb_build_object('own_backup_rows_visible', cnt);

  perform set_config('request.jwt.claim.sub', other::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', other::text, 'role', 'authenticated')::text, true);
  select count(*) into cnt from public.backups;
  res := res || jsonb_build_object('other_user_sees_backups', cnt);
  select count(*) into cnt from public.daily_activity;
  res := res || jsonb_build_object('other_user_sees_activity', cnt);
  begin
    insert into public.daily_activity (user_id, day, focus_minutes) values (other, current_date, 600);
    res := res || jsonb_build_object('direct_table_insert', 'NOT BLOCKED');
  exception when others then res := res || jsonb_build_object('direct_table_insert', sqlerrm);
  end;

  perform set_config('request.jwt.claim.sub', uid::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid::text, 'role', 'authenticated')::text, true);
  perform public.delete_my_cloud_data();
  reset role;
  select count(*) into cnt from public.backups where user_id = uid;
  res := res || jsonb_build_object('backups_after_delete', cnt);
  select count(*) into cnt from public.daily_activity where user_id = uid;
  res := res || jsonb_build_object('activity_after_delete', cnt);

  raise exception 'LIVE_TEST_RESULT %', res::text; -- rolls everything back
end $$;
