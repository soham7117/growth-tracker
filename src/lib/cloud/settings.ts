import { useSyncExternalStore } from 'react'

export interface CloudSettings {
  enabled: boolean // master switch; when false nothing cloud-related loads
  connection: 'builtin' | 'custom'
  customUrl: string
  customKey: string // Supabase anon (public) key; protected by row-level security
  backup: boolean // upload a private backup snapshot
  auto: boolean // automatic sync instead of manual push/pull
  encrypt: boolean // encrypt the backup in the browser with a passphrase
  lastRevision: number | null
  lastHash: string | null
  lastSyncedAt: number | null
  lastUserId: string | null // account this device last synced with (guards against mixing accounts)
}

export const CLOUD_DEFAULTS: CloudSettings = {
  enabled: false,
  connection: 'builtin',
  customUrl: '',
  customKey: '',
  backup: true,
  auto: false,
  encrypt: true,
  lastRevision: null,
  lastHash: null,
  lastSyncedAt: null,
  lastUserId: null,
}

const KEY = 'gt-cloud'
let current: CloudSettings = load()
const listeners = new Set<() => void>()

function load(): CloudSettings {
  try {
    return { ...CLOUD_DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }
  } catch {
    return CLOUD_DEFAULTS
  }
}

export const getCloud = () => current

export function updateCloud(patch: Partial<CloudSettings>) {
  current = { ...current, ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((l) => l())
}

export function useCloudSettings() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => current
  )
}
