import { describe, expect, it } from 'vitest'
import type { Flashcard } from '../db'
import { addDays, currentStreak, fmtDuration, fmtMinutes, longestStreak, parseTags, sm2, timeAgo, today } from './util'

describe('formatting', () => {
  it('formats durations', () => {
    expect(fmtDuration(65)).toBe('01:05')
    expect(fmtDuration(3725)).toBe('1:02:05')
    expect(fmtDuration(-5)).toBe('00:00')
  })

  it('formats minutes, including sub-minute values', () => {
    expect(fmtMinutes(0.25)).toBe('15s')
    expect(fmtMinutes(45)).toBe('45m')
    expect(fmtMinutes(60)).toBe('1h')
    expect(fmtMinutes(125)).toBe('2h 5m')
  })

  it('parses tags', () => {
    expect(parseTags('#React, algorithms  debugging')).toEqual(['react', 'algorithms', 'debugging'])
  })
})

describe('streaks', () => {
  it('counts consecutive days ending today', () => {
    const t = today()
    expect(currentStreak(new Set([t, addDays(t, -1), addDays(t, -2)]))).toBe(3)
  })

  it("does not break the streak if today isn't done yet", () => {
    const t = today()
    expect(currentStreak(new Set([addDays(t, -1), addDays(t, -2)]))).toBe(2)
  })

  it('resets after a gap', () => {
    const t = today()
    expect(currentStreak(new Set([t, addDays(t, -2)]))).toBe(1)
    expect(currentStreak(new Set())).toBe(0)
  })

  it('finds the longest streak', () => {
    expect(longestStreak(new Set(['2025-01-01', '2025-01-02', '2025-01-03', '2025-01-10', '2025-01-11']))).toBe(3)
  })
})

describe('sm2 spaced repetition', () => {
  const card: Flashcard = { front: 'q', back: 'a', skillId: null, ease: 2.5, interval: 0, reps: 0, due: today() }

  it('schedules a first good review for tomorrow, then 6 days', () => {
    const first = sm2(card, 4)
    expect(first.interval).toBe(1)
    expect(first.due).toBe(addDays(today(), 1))
    const second = sm2({ ...card, ...first } as Flashcard, 4)
    expect(second.interval).toBe(6)
  })

  it('resets on a failed review', () => {
    const r = sm2({ ...card, reps: 5, interval: 30 }, 1)
    expect(r.reps).toBe(0)
    expect(r.interval).toBe(1)
  })

  it('never drops ease below 1.3', () => {
    let c = { ...card }
    for (let i = 0; i < 20; i++) c = { ...c, ...sm2(c, 1) } as Flashcard
    expect(c.ease).toBeGreaterThanOrEqual(1.3)
  })
})

describe('timeAgo', () => {
  const now = 1_000_000_000_000
  it('formats relative times', () => {
    expect(timeAgo(now - 10_000, now)).toBe('just now')
    expect(timeAgo(now - 5 * 60_000, now)).toBe('5 min ago')
    expect(timeAgo(now - 3 * 3600_000, now)).toBe('3 h ago')
    expect(timeAgo(now - 2 * 86400_000, now)).toBe('2 d ago')
    expect(timeAgo(now + 5000, now)).toBe('just now')
  })
})
