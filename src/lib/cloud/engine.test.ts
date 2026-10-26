import 'fake-indexeddb/auto'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Storage shims for the node test environment
const store = () => {
  const m = new Map<string, string>()
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, String(v)), removeItem: (k: string) => void m.delete(k), clear: () => m.clear() }
}
vi.stubGlobal('localStorage', store())
vi.stubGlobal('sessionStorage', store())

const downloads: string[] = []
vi.mock('../util', async (orig) => ({ ...(await orig<typeof import('../util')>()), download: (name: string) => void downloads.push(name) }))

const pg = new PGlite()
let uid = '00000000-0000-0000-0000-0000000000aa'

// Minimal stand-in for the supabase-js calls the engine uses, executed against the real schema.sql.
async function run(sql: string, params: unknown[] = []) {
  await pg.exec('reset role')
  await pg.query("select set_config('request.jwt.claim.sub', $1, false)", [uid])
  await pg.exec('set role authenticated')
  try {
    return await pg.query(sql, params)
  } finally {
    await pg.exec('reset role')
  }
}
const fakeClient = {
  auth: { getSession: async () => ({ data: { session: { user: { id: uid } } } }) },
  rpc: async (fn: string, args: Record<string, unknown> = {}) => {
    try {
      const keys = Object.keys(args)
      const res = await run(`select * from ${fn}(${keys.map((k, i) => `${k} := $${i + 1}`).join(', ')})`, keys.map((k) => (typeof args[k] === 'object' && args[k] !== null ? JSON.stringify(args[k]) : args[k])))
      const scalar = res.fields.length === 1 && res.fields[0].name === fn
      return { data: scalar ? res.rows[0]?.[fn] : res.rows, error: null }
    } catch (e) {
      return { data: null, error: { message: (e as Error).message } }
    }
  },
  from: (table: string) => ({
    select: (cols: string) => ({
      maybeSingle: async () => {
        try {
          const res = await run(`select ${cols} from ${table}`)
          return { data: res.rows[0] ?? null, error: null }
        } catch (e) {
          return { data: null, error: { message: (e as Error).message } }
        }
      },
    }),
  }),
}
vi.mock('./client', () => ({ getClient: async () => fakeClient, activeConnection: () => ({}), hasBuiltin: true, BUILTIN: {}, redirectUrl: () => '' }))

const { db, clearAll } = await import('../../db')
const { syncNow, saveProfile, pushDailyStats, fetchLeaderboard } = await import('./engine')
const { updateCloud, getCloud, CLOUD_DEFAULTS } = await import('./settings')
const { getStatus, setPassphrase } = await import('./status')
const { currentSnapshot } = await import('./backup')
const { today } = await import('../util')

const aging = () => pg.exec(`update backups set updated_at = now() - interval '30 seconds'`) // skip the 3s push rate limit
const addLog = (learned: string) => db.logs.add({ date: today(), learned, blockers: '', wins: '', mood: 3, energy: 3, tags: [], createdAt: Date.now() })

beforeAll(async () => {
  await pg.exec(`
    create role anon nologin; create role authenticated nologin;
    create schema auth; create table auth.users (id uuid primary key, raw_app_meta_data jsonb not null default '{}'::jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth, public to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
    insert into auth.users values ('00000000-0000-0000-0000-0000000000aa'), ('00000000-0000-0000-0000-0000000000bb');
  `)
  await pg.exec(readFileSync(fileURLToPath(new URL('../../../supabase/schema.sql', import.meta.url)), 'utf8'))
}, 60000)

beforeEach(async () => {
  uid = '00000000-0000-0000-0000-0000000000aa'
  await pg.exec('delete from backups; delete from daily_activity; delete from profiles')
  await clearAll()
  downloads.length = 0
  setPassphrase('')
  updateCloud({ ...CLOUD_DEFAULTS, enabled: true, encrypt: false })
})

describe('syncNow (engine + real schema)', () => {
  it('does nothing when both sides are empty', async () => {
    expect(await syncNow()).toBe('noop')
    expect(getStatus().phase).toBe('ok')
  })

  it('uploads local data when the cloud is empty, then stays quiet', async () => {
    await addLog('first note')
    expect(await syncNow()).toBe('pushed')
    expect(getCloud().lastRevision).toBe(1)
    expect(await syncNow()).toBe('noop')
    const row = (await pg.query(`select revision, encrypted from backups`)).rows[0] as { revision: number; encrypted: boolean }
    expect(row).toEqual({ revision: 1, encrypted: false })
  })

  it('pushes new local changes as the next revision', async () => {
    await addLog('one')
    await syncNow()
    await aging()
    await addLog('two')
    expect(await syncNow()).toBe('pushed')
    expect(getCloud().lastRevision).toBe(2)
  })

  it('detects a conflict, leaves local data alone, and resolves in either direction', async () => {
    await addLog('shared')
    await syncNow()
    await aging()
    // another device pushes revision 2
    uid = '00000000-0000-0000-0000-0000000000aa'
    await run(`select push_backup('gt0.H4sIAAAAAAAAA4uuBQApu0wNAgAAAA==', false, 1, 'Other device')`) // gzip of "{}"-ish placeholder
    await addLog('local edit')
    expect(await syncNow()).toBe('conflict')
    expect(getStatus().phase).toBe('conflict')
    expect(await db.logs.count()).toBe(2)

    await aging()
    expect(await syncNow('local')).toBe('pushed') // keep this device
    expect(getCloud().lastRevision).toBe(3)
    expect(getStatus().phase).toBe('ok')
  })

  it('pulls newer cloud data into an untouched device and keeps a safety copy', async () => {
    await addLog('from phone')
    await syncNow()
    const phoneSnap = (await currentSnapshot()).snap

    // laptop: has some old local data and has never synced
    await clearAll()
    updateCloud({ lastRevision: null, lastHash: null })
    await db.logs.add({ date: '2020-01-01', learned: 'laptop data', blockers: '', wins: '', mood: 3, energy: 3, tags: [], createdAt: 1 })
    expect(await syncNow()).toBe('conflict') // both sides have data, never synced together

    expect(await syncNow('cloud')).toBe('pulled')
    expect(downloads.some((d) => d.includes('before-pull'))).toBe(true)
    expect((await db.logs.toArray()).map((l) => l.learned)).toEqual(phoneSnap.data.logs.map((l: { learned: string }) => l.learned))
  })

  it('encrypts when enabled and needs the right passphrase to restore', async () => {
    updateCloud({ encrypt: true })
    await addLog('secret journal entry')
    expect(await syncNow()).toBe('noop') // no passphrase yet
    expect(getStatus().message).toMatch(/passphrase/i)

    setPassphrase('hunter2')
    expect(await syncNow()).toBe('pushed')
    const data = (await pg.query(`select data, encrypted from backups`)).rows[0] as { data: string; encrypted: boolean }
    expect(data.encrypted).toBe(true)
    expect(data.data.startsWith('gt1.')).toBe(true)
    expect(data.data).not.toContain('secret')

    // new empty device
    await clearAll()
    updateCloud({ lastRevision: null, lastHash: null })
    setPassphrase('wrong')
    await syncNow()
    expect(getStatus().message).toMatch(/wrong passphrase/i)
    expect(await db.logs.count()).toBe(0)

    setPassphrase('hunter2')
    expect(await syncNow()).toBe('pulled')
    expect((await db.logs.toArray())[0].learned).toBe('secret journal entry')
  })
})

describe('leaderboard flow (engine + real schema)', () => {
  it('requires opting in, then publishes daily totals and ranks the user', async () => {
    await pg.query(`insert into auth.users values ('00000000-0000-0000-0000-0000000000cc') on conflict do nothing`)
    await db.sessions.add({ start: Date.now(), minutes: 60, kind: 'pomodoro', skillId: null, date: today() })
    await db.problems.add({ title: 'p', platform: 'x', difficulty: 'Easy', minutes: 5, hints: 0, solved: true, skillId: null, retryDate: '', date: today(), notes: '' })

    await saveProfile({ display_name: 'Tester', avatar: '🦊', country: null, leaderboard_opt_in: false })
    await expect(pushDailyStats()).rejects.toMatchObject({ message: expect.stringMatching(/not_opted_in/) })

    await saveProfile({ display_name: 'Tester', avatar: '🦊', country: 'IN', leaderboard_opt_in: true })
    expect(await pushDailyStats()).toBe(1)

    const { rows, me } = await fetchLeaderboard('week')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ display_name: 'Tester', rank: 1, is_me: true })
    expect(rows[0].score).toBe(2 + 3 + 1) // 1h focus (2) + 1 problem (3) + 1 active day
    expect(me?.display_name).toBe('Tester')
  })
})
