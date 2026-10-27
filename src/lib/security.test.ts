import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db, exportAll, importAll } from '../db'
import { safeHttpUrl } from './util'
import { readJson } from './storage'

describe('safeHttpUrl', () => {
  it('accepts http(s) links', () => {
    expect(safeHttpUrl('https://github.com/me/repo')).toBe('https://github.com/me/repo')
    expect(safeHttpUrl('  http://localhost:3000  ')).toBe('http://localhost:3000/')
  })
  it('rejects script and data URLs, junk and empty values', () => {
    for (const bad of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,<script>1</script>', 'file:///etc/passwd', 'not a url', '', null, undefined]) {
      expect(safeHttpUrl(bad as string)).toBeNull()
    }
  })
})

describe('importAll validation', () => {
  beforeEach(async () => {
    await db.skills.clear()
    await db.skills.add({ name: 'keep me', parentId: null, level: 1, createdAt: 1 })
  })

  it('rejects non-backup files without touching existing data', async () => {
    await expect(importAll(null)).rejects.toThrow('Not a Growth Tracker backup')
    await expect(importAll({ app: 'other', data: {} })).rejects.toThrow('Not a Growth Tracker backup')
    expect(await db.skills.count()).toBe(1)
  })

  it('rejects damaged tables before deleting anything', async () => {
    await expect(importAll({ app: 'growth-tracker', data: { skills: 'oops' } })).rejects.toThrow('damaged')
    await expect(importAll({ app: 'growth-tracker', data: { skills: [1, 2] } })).rejects.toThrow('damaged')
    expect(await db.skills.count()).toBe(1)
  })

  it('round-trips a valid export', async () => {
    const snap = await exportAll()
    await db.skills.clear()
    await importAll(snap)
    expect((await db.skills.toArray()).map((s) => s.name)).toEqual(['keep me'])
  })
})

describe('readJson', () => {
  const mem = new Map<string, string>()
  vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) })

  it('falls back to defaults for missing, corrupt or non-object values', () => {
    const d = { a: 1 }
    expect(readJson('missing-key', d)).toBe(d)
    localStorage.setItem('bad', '{oops')
    expect(readJson('bad', d)).toBe(d)
    localStorage.setItem('arr', '[1,2]')
    expect(readJson('arr', d)).toBe(d)
    localStorage.setItem('ok', '{"b":2}')
    expect(readJson('ok', d)).toEqual({ a: 1, b: 2 })
  })
})

describe('stale deploy detection', () => {
  it('recognises chunk-load failures from the major browsers', async () => {
    const { isChunkError } = await import('../components/ErrorBoundary')
    for (const m of ['Failed to fetch dynamically imported module: https://x/assets/A.js', 'error loading dynamically imported module', 'Importing a module script failed.']) {
      expect(isChunkError(new Error(m))).toBe(true)
    }
    expect(isChunkError(new Error('Cannot read properties of undefined'))).toBe(false)
  })
})
