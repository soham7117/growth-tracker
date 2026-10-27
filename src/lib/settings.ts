import { createStore } from './storage'

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

const store = createStore<Settings>('gt-settings', DEFAULTS)

export const getSettings = store.get
export const updateSettings = store.update
export const useSettings = store.use
