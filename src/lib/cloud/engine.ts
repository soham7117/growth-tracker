import { db, importAll } from '../../db'
import { download, today } from '../util'
import { currentSnapshot } from './backup'
import { getClient } from './client'
import { WrongPassphraseError, decodeBackup, encodeBackup } from './crypto'
import { decideSync, type SyncAction } from './decide'
import { getCloud, updateCloud } from './settings'
import { computeDailyRows } from './stats'
import { getPassphrase, setStatus } from './status'

export interface Profile {
  display_name: string
  avatar: string
  country: string | null
  leaderboard_opt_in: boolean
}

export interface BoardRow {
  rank: number
  display_name: string
  avatar: string
  country: string | null
  score: number
  active_days: number
  is_me: boolean
}

const deviceName = () => (navigator.userAgent.includes('Mobile') ? 'Phone' : navigator.platform || 'Browser').slice(0, 40)

export const friendlyError = (e: unknown) => {
  const msg = (e as { message?: string })?.message ?? String(e)
  if (/conflict/.test(msg)) return 'The cloud copy changed on another device.'
  if (/rate_limited/.test(msg)) return 'Too many syncs in a row. Try again in a few seconds.'
  if (/duplicate|unique|23505/i.test(msg)) return 'That display name is already taken.'
  if (/display_name_format/.test(msg)) return 'Names must be 3–24 characters: letters, numbers, spaces, . _ -'
  if (/not_opted_in/.test(msg)) return 'Turn on "Show me on the leaderboard" first.'
  if (/Failed to fetch|NetworkError/i.test(msg)) return 'No connection to the server.'
  return msg
}

async function requireClient() {
  const client = await getClient()
  if (!client) throw new Error('Cloud sync is not configured.')
  const { data } = await client.auth.getSession()
  if (!data.session) throw new Error('Sign in first.')
  return { client, userId: data.session.user.id }
}

/**
 * If a different account signs in on this device, forget the old sync markers so the first sync is
 * treated like a new device (a conflict is raised instead of silently mixing two accounts' data).
 */
function adoptUser(userId: string) {
  const cs = getCloud()
  if (cs.lastUserId && cs.lastUserId !== userId) updateCloud({ lastUserId: userId, lastRevision: null, lastHash: null })
  else if (cs.lastUserId !== userId) updateCloud({ lastUserId: userId })
}

export async function loadProfile(): Promise<Profile | null> {
  const { client } = await requireClient()
  const { data, error } = await client.from('profiles').select('display_name, avatar, country, leaderboard_opt_in').maybeSingle()
  if (error) throw error
  return data as Profile | null
}

export async function saveProfile(p: Profile) {
  const { client } = await requireClient()
  const { error } = await client.rpc('upsert_profile', { p_name: p.display_name, p_avatar: p.avatar, p_country: p.country, p_opt_in: p.leaderboard_opt_in })
  if (error) throw error
}

/** Leaderboard numbers (only for people who opted in). */
export async function pushDailyStats() {
  const { client } = await requireClient()
  const [sessions, roadmap, problems, activity] = await Promise.all([db.sessions.toArray(), db.roadmap.toArray(), db.problems.toArray(), db.activity.toArray()])
  const rows = computeDailyRows({ sessions, roadmap, problems, activity }, today())
  if (!rows.length) return 0
  const { data, error } = await client.rpc('sync_daily', { p_rows: rows })
  if (error) throw error
  return data as number
}

export async function fetchLeaderboard(period: 'week' | 'month' | 'all'): Promise<{ rows: BoardRow[]; me: BoardRow | null }> {
  const client = await getClient()
  if (!client) throw new Error('Cloud sync is not configured.')
  const { data, error } = await client.rpc('leaderboard', { p_period: period, p_limit: 100 })
  if (error) throw error
  const rows = ((data ?? []) as BoardRow[]).map((r) => ({ ...r, rank: Number(r.rank), score: Number(r.score) }))
  let me = rows.find((r) => r.is_me) ?? null
  if (!me) {
    const { data: session } = await client.auth.getSession()
    if (session.session) {
      const { data: mine } = await client.rpc('my_rank', { p_period: period })
      const m = (mine as BoardRow[] | null)?.[0]
      if (m) me = { ...m, rank: Number(m.rank), score: Number(m.score) }
    }
  }
  return { rows, me }
}

async function remoteMeta(client: Awaited<ReturnType<typeof requireClient>>['client']) {
  const { data, error } = await client.from('backups').select('revision, encrypted, updated_at, device, prev_updated_at').maybeSingle()
  if (error) throw error
  return data as { revision: number; encrypted: boolean; updated_at: string; device: string | null; prev_updated_at: string | null } | null
}

async function push(client: Awaited<ReturnType<typeof requireClient>>['client'], expected: number, hash: string, json: string) {
  const cs = getCloud()
  const pass = cs.encrypt ? getPassphrase() : ''
  if (cs.encrypt && !pass) throw new Error('passphrase_required')
  const payload = await encodeBackup(json, pass || undefined)
  const { data, error } = await client.rpc('push_backup', { p_data: payload, p_encrypted: !!pass, p_expected_revision: expected, p_device: deviceName() })
  if (error) throw error
  updateCloud({ lastRevision: data as number, lastHash: hash, lastSyncedAt: Date.now() })
}

async function pull(client: Awaited<ReturnType<typeof requireClient>>['client'], localHasData: boolean) {
  const { data, error } = await client.from('backups').select('data, encrypted, revision').maybeSingle()
  if (error) throw error
  if (!data) throw new Error('There is no cloud backup yet.')
  if (data.encrypted && !getPassphrase()) throw new Error('passphrase_required')
  const json = await decodeBackup(data.data as string, getPassphrase() || undefined)
  const parsed = JSON.parse(json)
  // Safety net: keep a copy of what's on this device before replacing it.
  if (localHasData) {
    const { snap } = await currentSnapshot()
    download(`growth-tracker-before-pull-${today()}.json`, JSON.stringify(snap, null, 2))
  }
  await importAll(parsed)
  const { hash } = await currentSnapshot()
  updateCloud({ lastRevision: data.revision as number, lastHash: hash, lastSyncedAt: Date.now() })
}

export type SyncOutcome = SyncAction | 'pushed' | 'pulled'

/**
 * One sync pass. `force` resolves a conflict: 'local' overwrites the cloud, 'cloud' overwrites this device.
 */
export async function syncNow(force?: 'local' | 'cloud'): Promise<SyncOutcome> {
  setStatus('syncing', 'Syncing…')
  try {
    const { client, userId } = await requireClient()
    adoptUser(userId)
    const cs = getCloud()
    let outcome: SyncOutcome = 'noop'

    if (cs.backup) {
      const meta = await remoteMeta(client)
      const { snap, hash, empty } = await currentSnapshot()
      const action: SyncAction = force
        ? force === 'local'
          ? 'push'
          : 'pull'
        : decideSync({ remoteRevision: meta?.revision ?? null, lastRevision: cs.lastRevision, localDirty: hash !== cs.lastHash, localEmpty: empty })

      if (action === 'conflict') {
        setStatus('conflict', 'This device and the cloud both have changes. Choose which to keep.')
        return 'conflict'
      }
      if (action === 'push') {
        await push(client, meta?.revision ?? 0, hash, JSON.stringify(snap))
        outcome = 'pushed'
      } else if (action === 'pull') {
        await pull(client, !empty)
        outcome = 'pulled'
      }
    }

    // Leaderboard numbers are separate from the private backup and only sent if the user opted in.
    const profile = await loadProfile().catch(() => null)
    if (profile?.leaderboard_opt_in) await pushDailyStats()

    updateCloud({ lastSyncedAt: Date.now() })
    setStatus('ok', outcome === 'pushed' ? 'Uploaded to the cloud.' : outcome === 'pulled' ? 'Downloaded from the cloud.' : 'Up to date.')
    return outcome
  } catch (e) {
    if (e instanceof WrongPassphraseError || /wrong_passphrase/.test((e as Error).message)) setStatus('error', 'Wrong passphrase for this cloud backup.')
    else if (/passphrase_required/.test((e as Error).message)) setStatus('error', 'Enter your encryption passphrase to sync.')
    else if (/conflict/.test((e as Error).message)) setStatus('conflict', friendlyError(e))
    else setStatus('error', friendlyError(e))
    return 'noop'
  }
}

export async function deleteCloudData() {
  const { client } = await requireClient()
  const { error } = await client.rpc('delete_my_cloud_data')
  if (error) throw error
  updateCloud({ lastRevision: null, lastHash: null })
}

export async function deleteAccount() {
  const { client } = await requireClient()
  const { error } = await client.rpc('delete_my_account')
  if (error) throw error
  await client.auth.signOut()
  updateCloud({ lastRevision: null, lastHash: null })
}

export async function isCloudBackupEncrypted() {
  const { client } = await requireClient()
  const meta = await remoteMeta(client)
  return meta?.encrypted ?? false
}

export interface CloudInfo {
  revision: number
  device: string | null
  updatedAt: number
  encrypted: boolean
  previousAt: number | null // when the undo copy was saved, if there is one
}

export async function loadCloudInfo(): Promise<CloudInfo | null> {
  const { client } = await requireClient()
  const meta = await remoteMeta(client)
  if (!meta) return null
  return {
    revision: meta.revision,
    device: meta.device,
    updatedAt: new Date(meta.updated_at).getTime(),
    encrypted: meta.encrypted,
    previousAt: meta.prev_updated_at ? new Date(meta.prev_updated_at).getTime() : null,
  }
}

/** Swap the cloud backup with its saved previous version, then load it onto this device. */
export async function restorePrevious() {
  const { client } = await requireClient()
  const { error } = await client.rpc('restore_previous_backup')
  if (error) throw error
  return syncNow('cloud')
}
