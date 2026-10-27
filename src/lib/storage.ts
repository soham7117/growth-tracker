import { useSyncExternalStore } from 'react'

/** localStorage can throw (private mode, blocked site data, quota), so every access goes through here. */
export function readJson<T extends object>(key: string, defaults: T): T {
  try {
    const raw = localStorage.getItem(key)
    const parsed = raw ? JSON.parse(raw) : null
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? { ...defaults, ...parsed } : defaults
  } catch {
    return defaults
  }
}

export function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable: the value still lives in memory for this session */
  }
}

export function readString(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeString(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* ignore */
  }
}

/** A tiny persisted store: read synchronously anywhere, subscribe from React with `use()`. */
export function createStore<T extends object>(key: string, defaults: T) {
  let current = readJson(key, defaults)
  const listeners = new Set<() => void>()
  const subscribe = (cb: () => void) => {
    listeners.add(cb)
    return () => void listeners.delete(cb)
  }
  return {
    get: () => current,
    update(patch: Partial<T>) {
      current = { ...current, ...patch }
      writeJson(key, current)
      listeners.forEach((l) => l())
    },
    use: () => useSyncExternalStore(subscribe, () => current),
  }
}
