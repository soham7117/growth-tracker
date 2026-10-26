export type SyncAction = 'noop' | 'push' | 'pull' | 'conflict'

export interface SyncState {
  remoteRevision: number | null // null = nothing in the cloud yet
  lastRevision: number | null // revision this device last synced with (null = never)
  localDirty: boolean // local data changed since the last sync
  localEmpty: boolean // this device has no data at all
}

/** Pure decision logic for backup sync. A conflict means both sides changed; the user must choose. */
export function decideSync(s: SyncState): SyncAction {
  if (s.remoteRevision === null) return s.localEmpty ? 'noop' : 'push'
  if (s.lastRevision === null) return s.localEmpty ? 'pull' : 'conflict'
  if (s.remoteRevision > s.lastRevision) return s.localDirty ? 'conflict' : 'pull'
  if (s.remoteRevision < s.lastRevision) return 'conflict' // cloud was reset or replaced
  return s.localDirty ? 'push' : 'noop'
}
