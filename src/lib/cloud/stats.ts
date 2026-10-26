import { addDays, dstr } from '../util'

export interface DailyRow {
  day: string
  focus_minutes: number
  topics_passed: number
  problems_logged: number
  cards_reviewed: number
}

export interface StatsInput {
  sessions: { date: string; minutes: number }[]
  roadmap: { doneAt: number; done: boolean }[]
  problems: { date: string }[]
  activity: { date: string; cardsReviewed: number }[]
}

/**
 * Per-day leaderboard numbers derived from local data. The server clamps and validates
 * everything again, so these are only a convenience for honest clients.
 */
export function computeDailyRows(input: StatsInput, today: string, daysBack = 400): DailyRow[] {
  const from = addDays(today, -daysBack)
  const map = new Map<string, DailyRow>()
  const row = (day: string) => {
    let r = map.get(day)
    if (!r) map.set(day, (r = { day, focus_minutes: 0, topics_passed: 0, problems_logged: 0, cards_reviewed: 0 }))
    return r
  }
  for (const s of input.sessions) if (s.date >= from && s.date <= today) row(s.date).focus_minutes += s.minutes
  for (const t of input.roadmap) {
    if (!t.done) continue
    const day = dstr(new Date(t.doneAt))
    if (day >= from && day <= today) row(day).topics_passed += 1
  }
  for (const p of input.problems) if (p.date >= from && p.date <= today) row(p.date).problems_logged += 1
  for (const a of input.activity) if (a.date >= from && a.date <= today) row(a.date).cards_reviewed += a.cardsReviewed

  return [...map.values()]
    .map((r) => ({ ...r, focus_minutes: Math.round(r.focus_minutes) }))
    .filter((r) => r.focus_minutes > 0 || r.topics_passed > 0 || r.problems_logged > 0 || r.cards_reviewed > 0)
    .sort((a, b) => a.day.localeCompare(b.day))
}
