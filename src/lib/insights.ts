import type { Flashcard, LogEntry, Problem, Session, Skill } from '../db'
import { addDays, daysBetween, today } from './util'

export interface Nudge {
  icon: string
  text: string
  tone: 'warn' | 'info' | 'good'
}

/** Rule-based suggestions — no AI involved. */
export function buildNudges(a: { skills: Skill[]; sessions: Session[]; logs: LogEntry[]; cards: Flashcard[]; problems: Problem[]; goalMin: number }): Nudge[] {
  const out: Nudge[] = []
  const t = today()
  const todayMin = a.sessions.filter((s) => s.date === t).reduce((x, s) => x + s.minutes, 0)

  if (todayMin === 0) out.push({ icon: '⏱️', text: 'No focus time logged today yet — start a session.', tone: 'warn' })
  else if (todayMin >= a.goalMin) out.push({ icon: '🔥', text: `Daily goal reached (${Math.round(todayMin)} min). Nice work!`, tone: 'good' })
  if (!a.logs.some((l) => l.date === t)) out.push({ icon: '📓', text: "You haven't written today's journal entry.", tone: 'info' })

  const due = a.cards.filter((c) => c.due <= t).length
  if (due) out.push({ icon: '🃏', text: `${due} flashcard${due > 1 ? 's' : ''} due for review.`, tone: 'warn' })
  const retry = a.problems.filter((p) => p.retryDate && p.retryDate <= t).length
  if (retry) out.push({ icon: '🔁', text: `${retry} problem${retry > 1 ? 's' : ''} ready to retry.`, tone: 'warn' })

  const stale = a.skills
    .filter((s) => s.level > 0 || s.lastPracticed)
    .map((s) => ({ s, d: s.lastPracticed ? daysBetween(s.lastPracticed, t) : 999 }))
    .filter((x) => x.d >= 10)
    .sort((x, y) => y.d - x.d)
    .slice(0, 3)
  for (const { s, d } of stale) {
    out.push({ icon: '🧠', text: d === 999 ? `${s.name}: never practiced.` : `${s.name}: no practice in ${d} days.`, tone: 'info' })
  }

  const week = a.sessions.filter((s) => s.date > addDays(t, -7)).reduce((x, s) => x + s.minutes, 0)
  const prev = a.sessions.filter((s) => s.date <= addDays(t, -7) && s.date > addDays(t, -14)).reduce((x, s) => x + s.minutes, 0)
  if (prev > 0 && week < prev * 0.6) out.push({ icon: '📉', text: `This week's focus time is down ${Math.round((1 - week / prev) * 100)}% vs last week.`, tone: 'warn' })
  if (prev > 0 && week > prev * 1.2) out.push({ icon: '📈', text: `Focus time is up ${Math.round((week / prev - 1) * 100)}% vs last week.`, tone: 'good' })

  return out
}
