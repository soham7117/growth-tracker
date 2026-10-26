import { useSyncExternalStore } from 'react'

export type SyncPhase = 'idle' | 'syncing' | 'ok' | 'error' | 'conflict'

export interface SyncStatus {
  phase: SyncPhase
  message: string
  at: number | null
}

let status: SyncStatus = { phase: 'idle', message: '', at: null }
const listeners = new Set<() => void>()

export function setStatus(phase: SyncPhase, message = '') {
  status = { phase, message, at: Date.now() }
  listeners.forEach((l) => l())
}

export const getStatus = () => status

export function useSyncStatus() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => status
  )
}

// The encryption passphrase lives only in this tab's sessionStorage, never on disk or in the cloud.
const PASS_KEY = 'gt-passphrase'
export const getPassphrase = () => {
  try {
    return sessionStorage.getItem(PASS_KEY) || ''
  } catch {
    return ''
  }
}
export const setPassphrase = (p: string) => {
  try {
    p ? sessionStorage.setItem(PASS_KEY, p) : sessionStorage.removeItem(PASS_KEY)
  } catch {
    /* ignore */
  }
}
