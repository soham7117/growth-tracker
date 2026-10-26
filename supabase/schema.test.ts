import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'

const sql = readFileSync(fileURLToPath(new URL('./schema.sql', import.meta.url)), 'utf8')
const db = new PGlite()

it('supabase/schema.sql: security, validation, scoring and deletion', async () => {

const A = '00000000-0000-0000-0000-00000000000a'
const B = '00000000-0000-0000-0000-00000000000b'
const C = '00000000-0000-0000-0000-00000000000c'

const ok = (cond: unknown, name: string, extra = '') => { expect(!!cond, name + (extra ? ' :: ' + extra : '')).toBe(true) }
const as = async (role: string | null, uid?: string) => {
  await db.exec('reset role')
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [uid ?? ''])
  if (role) await db.exec(`set role ${role}`)
}
const tryQ = async (q: string, params?: unknown[]): Promise<{ r?: any; e?: string }> => { try { return { r: await db.query(q, params) } } catch (e: any) { return { e: e.message } } }

// Supabase stubs
await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  insert into auth.users values ('${A}'), ('${B}'), ('${C}');
`)

// schema loads, and loads twice (idempotent)
try { await db.exec(sql); ok(true, 'schema.sql runs') } catch (e: any) { ok(false, 'schema.sql runs', e.message) }
try { await db.exec(sql); ok(true, 'schema.sql is re-runnable') } catch (e: any) { ok(false, 'schema.sql is re-runnable', e.message) }

// profiles
await as('authenticated', A)
ok(!(await tryQ(`select upsert_profile('Alice', '🦊', 'in', true)`)).e, 'A creates profile (country upper-cased)')
await as('authenticated', B)
let r = await tryQ(`select upsert_profile('alice', '🙂', null, true)`)
ok(r.e && /duplicate|unique/i.test(r.e), 'duplicate display name rejected (case-insensitive)', r.e)
ok(!!(await tryQ(`select upsert_profile('a', '🙂', null, true)`)).e, 'too-short name rejected')
ok(!!(await tryQ(`select upsert_profile('bad<script>', '🙂', null, true)`)).e, 'unsafe characters rejected')
ok(!(await tryQ(`select upsert_profile('Bob', '🐻', null, true)`)).e, 'B creates profile')
await as('authenticated', C)
ok(!(await tryQ(`select upsert_profile('Carol', '🙂', null, false)`)).e, 'C creates profile (not opted in)')

// daily activity
await as('authenticated', A)
const day = (n: number) => `(current_date - ${n})::text`
r = await tryQ(`select sync_daily(jsonb_build_array(
  jsonb_build_object('day', ${day(1)}, 'focus_minutes', 90, 'topics_passed', 2, 'problems_logged', 3, 'cards_reviewed', 10),
  jsonb_build_object('day', ${day(2)}, 'focus_minutes', 9999, 'topics_passed', 99, 'problems_logged', 999, 'cards_reviewed', 9999),
  jsonb_build_object('day', ${day(10)}, 'focus_minutes', 60, 'topics_passed', 1, 'problems_logged', 0, 'cards_reviewed', 0),
  jsonb_build_object('day', ${day(900)}, 'focus_minutes', 60, 'topics_passed', 1, 'problems_logged', 0, 'cards_reviewed', 0),
  jsonb_build_object('day', (current_date + 30)::text, 'focus_minutes', 60, 'topics_passed', 1, 'problems_logged', 0, 'cards_reviewed', 0)
))`)
ok(r.r?.rows[0] && Object.values(r.r.rows[0])[0] === 3, 'sync_daily accepts 3 valid rows, ignores out-of-range days', JSON.stringify(r))
await as(null)
let rows = (await db.query(`select (current_date - day) as ago, focus_minutes, topics_passed, problems_logged, cards_reviewed from daily_activity where user_id = '${A}' order by ago`)).rows
const clamped = rows.find((x: any) => x.ago === 2)
ok(clamped && clamped.focus_minutes === 720 && clamped.topics_passed === 20 && clamped.problems_logged === 50 && clamped.cards_reviewed === 500, 'over-cap values are clamped', JSON.stringify(rows))

// old days are insert-only; recent days upsert
await as('authenticated', A)
await tryQ(`select sync_daily(jsonb_build_array(
  jsonb_build_object('day', ${day(10)}, 'focus_minutes', 700, 'topics_passed', 20),
  jsonb_build_object('day', ${day(1)}, 'focus_minutes', 120, 'topics_passed', 2, 'problems_logged', 3, 'cards_reviewed', 10)))`)
await as(null)
rows = (await db.query(`select (current_date - day) as ago, focus_minutes from daily_activity where user_id = '${A}' order by ago`)).rows
ok(rows.find((x: any) => x.ago === 10)?.focus_minutes === 60, 'old day cannot be rewritten', JSON.stringify(rows))
ok(rows.find((x: any) => x.ago === 1)?.focus_minutes === 120, 'recent day can be updated')

await as('authenticated', C)
r = await tryQ(`select sync_daily('[]'::jsonb)`)
ok(r.e && /not_opted_in/.test(r.e), 'non-opted-in user cannot write leaderboard data', r.e)

// backups
await as('authenticated', A)
r = await tryQ(`select push_backup('gt0.abc', false, 0, 'Mac')`)
ok(Object.values(r.r?.rows[0] ?? {})[0] === 1, 'first backup push returns revision 1', JSON.stringify(r))
r = await tryQ(`select push_backup('gt0.def', false, 1, 'Mac')`)
ok(r.e && /rate_limited/.test(r.e), 'rapid second push is rate limited', r.e)
await as(null)
await db.exec(`update backups set updated_at = now() - interval '10 seconds'`)
await as('authenticated', A)
r = await tryQ(`select push_backup('gt0.def', false, 1, 'Mac')`)
ok(Object.values(r.r?.rows[0] ?? {})[0] === 2, 'push with correct revision returns 2', JSON.stringify(r))
await as(null)
await db.exec(`update backups set updated_at = now() - interval '10 seconds'`)
await as('authenticated', A)
r = await tryQ(`select push_backup('gt0.ghi', false, 1, 'Phone')`)
ok(r.e && /conflict/.test(r.e), 'push with stale revision raises conflict', r.e)
r = await tryQ(`select push_backup('${'x'.repeat(1500001)}', false, 2, 'Mac')`)
ok(!!r.e, 'oversized backup rejected')

// row level security + privileges
r = await tryQ(`select count(*)::int as n from backups`)
ok(r.r?.rows[0].n === 1, 'A can read own backup')
await as('authenticated', B)
r = await tryQ(`select count(*)::int as n from backups`)
ok(r.r?.rows[0].n === 0, "B cannot read A's backup", JSON.stringify(r))
r = await tryQ(`select count(*)::int as n from daily_activity`)
ok(r.r?.rows[0].n === 0, "B cannot read A's activity")
r = await tryQ(`select count(*)::int as n from profiles`)
ok(r.r?.rows[0].n === 1, 'B can only read own profile row', JSON.stringify(r))
ok(!!(await tryQ(`insert into daily_activity (user_id, day, focus_minutes) values ('${B}', current_date, 600)`)).e, 'direct insert into daily_activity denied')
ok(!!(await tryQ(`update profiles set leaderboard_opt_in = true where user_id = '${A}'`)).e || true, 'direct update denied or affects 0 rows')
await as(null)
ok((await db.query(`select leaderboard_opt_in from profiles where user_id = '${A}'`)).rows[0].leaderboard_opt_in === true, "B's direct update did not change A's row")
await as('anon')
ok(!!(await tryQ(`select push_backup('x', false, 0, null)`)).e, 'anon cannot push backups')
ok(!!(await tryQ(`select * from backups`)).e, 'anon cannot read backups table')
ok(!!(await tryQ(`select * from profiles`)).e, 'anon cannot read profiles table')

// leaderboard
await as('authenticated', B)
await tryQ(`select sync_daily(jsonb_build_array(jsonb_build_object('day', ${day(0)}, 'focus_minutes', 30, 'topics_passed', 1)))`)
await as('anon')
r = await tryQ(`select * from leaderboard('week', 100)`)
const wk = r.r?.rows ?? []
ok(wk.length === 2 && wk[0].display_name === 'Alice' && Number(wk[0].score) === 293 && Number(wk[0].rank) === 1, 'week board: Alice 293.0 (35 + 256 clamped day + 2 active days)', JSON.stringify(wk))
ok(wk[1]?.display_name === 'Bob' && Number(wk[1].score) === 12, 'week board: Bob 10 + 1 + 1 bonus = 12.0', JSON.stringify(wk[1]))
r = await tryQ(`select * from leaderboard('month', 100)`)
ok(Number(r.r?.rows.find((x: any) => x.display_name === 'Alice').score) === 306, 'month board includes older day (306.0)', JSON.stringify(r.r?.rows))
r = await tryQ(`select * from leaderboard('week', 100)`)
ok(r.r?.rows.every((x: any) => x.is_me === false), 'guest sees no is_me flag')
ok(!JSON.stringify(wk, (_k: string, v: unknown) => (typeof v === 'bigint' ? Number(v) : v)).includes('user_id'), 'leaderboard exposes no user ids')
await as(null)
await db.exec(`update profiles set hidden = true where display_name = 'Bob'`)
await as('authenticated', A)
r = await tryQ(`select * from leaderboard('week', 100)`)
ok(r.r?.rows.length === 1 && r.r.rows[0].is_me === true, 'hidden users are excluded; is_me set for the caller')
r = await tryQ(`select * from my_rank('week')`)
ok(r.r?.rows.length === 1 && Number(r.r.rows[0].rank) === 1, 'my_rank returns the caller row')
await as('authenticated', C)
r = await tryQ(`select * from leaderboard('week', 100)`)
ok(r.r?.rows.every((x: any) => x.display_name !== 'Carol'), 'users who did not opt in never appear')

// deletion
await as('authenticated', A)
ok(!(await tryQ(`select delete_my_cloud_data()`)).e, 'delete_my_cloud_data works')
await as(null)
ok((await db.query(`select count(*)::int as n from backups where user_id='${A}'`)).rows[0].n === 0, 'cloud data gone')
await as('authenticated', A)
ok(!(await tryQ(`select delete_my_account()`)).e, 'delete_my_account works')
await as(null)
ok((await db.query(`select (select count(*) from profiles where user_id='${A}')::int + (select count(*) from daily_activity where user_id='${A}')::int as n`)).rows[0].n === 0, 'account deletion cascades to all tables')


}, 120000)
