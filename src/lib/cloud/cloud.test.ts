import { describe, expect, it } from 'vitest'
import { hashSnapshot, isSnapshotEmpty } from './backup'
import { WrongPassphraseError, decodeBackup, encodeBackup, isEncryptedBackup } from './crypto'
import { decideSync } from './decide'
import { computeDailyRows } from './stats'

describe('backup encoding', () => {
  const json = JSON.stringify({ app: 'growth-tracker', data: { logs: [{ learned: 'Décorateurs 🎉 and ``` code ```' }] } })

  it('round-trips compressed (unencrypted) backups', async () => {
    const text = await encodeBackup(json)
    expect(text.startsWith('gt0.')).toBe(true)
    expect(isEncryptedBackup(text)).toBe(false)
    expect(await decodeBackup(text)).toBe(json)
  })

  it('round-trips encrypted backups and hides the content', async () => {
    const text = await encodeBackup(json, 'correct horse')
    expect(isEncryptedBackup(text)).toBe(true)
    expect(text).not.toContain('Décorateurs')
    expect(await decodeBackup(text, 'correct horse')).toBe(json)
  })

  it('rejects a wrong or missing passphrase', async () => {
    const text = await encodeBackup(json, 'correct horse')
    await expect(decodeBackup(text, 'wrong')).rejects.toBeInstanceOf(WrongPassphraseError)
    await expect(decodeBackup(text)).rejects.toBeInstanceOf(WrongPassphraseError)
  })

  it('uses a fresh salt/iv each time', async () => {
    expect(await encodeBackup(json, 'pw')).not.toBe(await encodeBackup(json, 'pw'))
  })

  it('compresses large repetitive data well under the 1.5 MB server cap', async () => {
    const big = JSON.stringify({ rows: Array.from({ length: 20000 }, (_, i) => ({ i, text: 'practice session on algorithms ' + (i % 50) })) })
    const text = await encodeBackup(big)
    expect(big.length).toBeGreaterThan(1_000_000)
    expect(text.length).toBeLessThan(big.length / 4)
    expect(await decodeBackup(text)).toBe(big)
  })

  it('refuses unknown formats', async () => {
    await expect(decodeBackup('nope')).rejects.toThrow()
  })
})

describe('snapshot helpers', () => {
  it('hash is stable and ignores the export timestamp', async () => {
    const a = { data: { logs: [{ id: 1 }], sessions: [] } } as never
    const b = { data: { logs: [{ id: 1 }], sessions: [] }, exportedAt: 'x' } as never
    expect(await hashSnapshot(a)).toBe(await hashSnapshot(b))
    expect(await hashSnapshot(a)).not.toBe(await hashSnapshot({ data: { logs: [{ id: 2 }], sessions: [] } } as never))
  })

  it('detects an empty snapshot', () => {
    expect(isSnapshotEmpty({ data: { logs: [], sessions: [] } } as never)).toBe(true)
    expect(isSnapshotEmpty({ data: { logs: [{ id: 1 }] } } as never)).toBe(false)
  })
})

describe('decideSync', () => {
  const base = { remoteRevision: 3, lastRevision: 3, localDirty: false, localEmpty: false }
  it('does nothing when both sides are unchanged', () => expect(decideSync(base)).toBe('noop'))
  it('pushes local changes', () => expect(decideSync({ ...base, localDirty: true })).toBe('push'))
  it('pulls newer cloud data when local is untouched', () => expect(decideSync({ ...base, remoteRevision: 4 })).toBe('pull'))
  it('flags a conflict when both changed', () => expect(decideSync({ ...base, remoteRevision: 4, localDirty: true })).toBe('conflict'))
  it('first upload when the cloud is empty', () => {
    expect(decideSync({ remoteRevision: null, lastRevision: null, localDirty: true, localEmpty: false })).toBe('push')
    expect(decideSync({ remoteRevision: null, lastRevision: null, localDirty: false, localEmpty: true })).toBe('noop')
  })
  it('new device: pulls when empty, conflicts when it already has data', () => {
    expect(decideSync({ remoteRevision: 2, lastRevision: null, localDirty: false, localEmpty: true })).toBe('pull')
    expect(decideSync({ remoteRevision: 2, lastRevision: null, localDirty: true, localEmpty: false })).toBe('conflict')
  })
  it('treats a cloud that went backwards as a conflict', () => expect(decideSync({ ...base, remoteRevision: 1 })).toBe('conflict'))
})

describe('computeDailyRows', () => {
  const t = new Date()
  const local = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const today = local(t)
  const yesterdayDate = new Date(t.getTime() - 86400000)
  const yesterday = local(yesterdayDate)

  it('aggregates sessions, topics, problems and cards per day', () => {
    const rows = computeDailyRows(
      {
        sessions: [
          { date: today, minutes: 25 },
          { date: today, minutes: 50.4 },
          { date: yesterday, minutes: 30 },
        ],
        roadmap: [
          { doneAt: yesterdayDate.getTime(), done: true },
          { doneAt: t.getTime(), done: true },
          { doneAt: t.getTime(), done: false },
        ],
        problems: [{ date: today }, { date: today }],
        activity: [{ date: today, cardsReviewed: 7 }],
      },
      today
    )
    expect(rows).toEqual([
      { day: yesterday, focus_minutes: 30, topics_passed: 1, problems_logged: 0, cards_reviewed: 0 },
      { day: today, focus_minutes: 75, topics_passed: 1, problems_logged: 2, cards_reviewed: 7 },
    ])
  })

  it('skips empty days and days outside the window', () => {
    expect(computeDailyRows({ sessions: [{ date: '2000-01-01', minutes: 60 }], roadmap: [], problems: [], activity: [] }, today)).toEqual([])
  })
})
