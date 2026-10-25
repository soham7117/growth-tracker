import { addDays as addDaysFn, differenceInCalendarDays, format, parseISO } from 'date-fns'
import type { Flashcard, LogEntry, Session } from '../db'

export const dstr = (d: Date) => format(d, 'yyyy-MM-dd')
export const today = () => dstr(new Date())
export const addDays = (s: string, n: number) => dstr(addDaysFn(parseISO(s), n))
export const daysBetween = (a: string, b: string) => differenceInCalendarDays(parseISO(b), parseISO(a))
export const prettyDate = (s: string) => format(parseISO(s), 'EEE, d MMM yyyy')

export function quarterOf(d = new Date()) {
  return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`
}

export function fmtDuration(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(sec).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export function fmtMinutes(min: number) {
  if (min > 0 && min < 1) return `${Math.max(1, Math.round(min * 60))}s`
  const m = Math.round(min)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? `${h}h ${r}m` : `${h}h`
}

export function minutesByDate(sessions: Session[]) {
  const map: Record<string, number> = {}
  for (const s of sessions) map[s.date] = (map[s.date] || 0) + s.minutes
  return map
}

/** Days with any activity (a focus session or a journal entry). */
export function activeDates(sessions: Session[], logs: LogEntry[]) {
  const set = new Set<string>()
  for (const s of sessions) set.add(s.date)
  for (const l of logs) set.add(l.date)
  return set
}

export function currentStreak(active: Set<string>) {
  let day = today()
  if (!active.has(day)) day = addDays(day, -1) // today not done yet doesn't break the streak
  let n = 0
  while (active.has(day)) {
    n++
    day = addDays(day, -1)
  }
  return n
}

export function longestStreak(active: Set<string>) {
  const days = [...active].sort()
  let best = 0
  let run = 0
  let prev: string | null = null
  for (const d of days) {
    run = prev && daysBetween(prev, d) === 1 ? run + 1 : 1
    best = Math.max(best, run)
    prev = d
  }
  return best
}

/** SM-2 spaced repetition. quality: 1 again, 3 hard, 4 good, 5 easy. */
export function sm2(card: Flashcard, quality: number): Partial<Flashcard> {
  let { ease, interval, reps } = card
  if (quality < 3) {
    reps = 0
    interval = 1
  } else {
    reps += 1
    interval = reps === 1 ? 1 : reps === 2 ? 6 : Math.round(interval * ease)
  }
  ease = Math.max(1.3, ease + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  return { ease, interval, reps, due: addDays(today(), interval) }
}

export function download(filename: string, text: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function parseTags(s: string) {
  return s
    .split(/[,\s]+/)
    .map((t) => t.replace(/^#/, '').trim().toLowerCase())
    .filter(Boolean)
}
