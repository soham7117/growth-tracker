import { TABLES, exportAll } from '../../db'

type Snapshot = Awaited<ReturnType<typeof exportAll>>

/** Stable fingerprint of the data (ignores the export timestamp). */
export async function hashSnapshot(snap: Pick<Snapshot, 'data'>) {
  const bytes = new TextEncoder().encode(JSON.stringify(snap.data))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function isSnapshotEmpty(snap: Pick<Snapshot, 'data'>) {
  return TABLES.every((t) => (snap.data[t]?.length ?? 0) === 0)
}

export async function currentSnapshot() {
  const snap = await exportAll()
  return { snap, hash: await hashSnapshot(snap), empty: isSnapshotEmpty(snap) }
}
