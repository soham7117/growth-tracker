import { useSyncExternalStore } from 'react'

export interface Settings {
  focusMin: number
  shortBreakMin: number
  longBreakMin: number
  autoStartBreaks: boolean
  dailyGoalMin: number
  sound: boolean
  notifications: boolean
  dailyReminder: string // HH:mm or ''
  weeklyReminderDay: number // 0=Sun..6=Sat, -1 off
  weeklyReminderTime: string
  theme: 'dark' | 'light'
}

export const DEFAULTS: Settings = {
  focusMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
  autoStartBreaks: true,
  dailyGoalMin: 120,
  sound: true,
  notifications: true,
  dailyReminder: '19:00',
  weeklyReminderDay: 0,
  weeklyReminderTime: '18:00',
  theme: 'dark',
}

const KEY = 'gt-settings'
let current: Settings = load()
const listeners = new Set<() => void>()

function load(): Settings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }
  } catch {
    return DEFAULTS
  }
}

export function getSettings() {
  return current
}

export function updateSettings(patch: Partial<Settings>) {
  current = { ...current, ...patch }
  localStorage.setItem(KEY, JSON.stringify(current))
  listeners.forEach((l) => l())
}

export function useSettings() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => current
  )
}
