import { describe, expect, it } from 'vitest'
import { PRACTICE } from './practice'
import { PYTHON_ROADMAP } from './pythonRoadmap'
import { QUIZZES } from './quizzes'

const ids = PYTHON_ROADMAP.flatMap((s) => s.items.map((i) => i.id))

describe('roadmap data', () => {
  it('has unique item ids', () => {
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('quiz bank', () => {
  it('has a quiz for every roadmap topic and none for unknown topics', () => {
    expect(ids.filter((id) => !QUIZZES[id])).toEqual([])
    expect(Object.keys(QUIZZES).filter((k) => !ids.includes(k))).toEqual([])
  })

  it('has well-formed questions (1 correct + 3 distinct wrong answers, explanation)', () => {
    for (const [id, qs] of Object.entries(QUIZZES)) {
      expect(qs.length, id).toBeGreaterThanOrEqual(1)
      for (const q of qs) {
        expect(q.q.trim(), id).not.toBe('')
        expect(q.why.trim(), id).not.toBe('')
        expect(new Set([q.correct, ...q.wrong]).size, `${id}: ${q.q}`).toBe(4)
      }
    }
  })
})

describe('practice links', () => {
  it('only references real roadmap topics and uses https LeetCode URLs', () => {
    for (const [id, problems] of Object.entries(PRACTICE)) {
      expect(ids, id).toContain(id)
      for (const p of problems) expect(p.url).toMatch(/^https:\/\/leetcode\.com\/problems\/[a-z0-9-]+\/$/)
    }
  })
})
