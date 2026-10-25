import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type LogEntry } from '../db'
import { Card, DictateButton, Empty, RichText } from '../components/ui'
import { parseTags, prettyDate, today } from '../lib/util'

const EMOJI = ['', '😞', '😕', '😐', '🙂', '😄']

type Draft = { date: string; learned: string; blockers: string; wins: string; mood: number; energy: number; tags: string }
const blank = (): Draft => ({ date: today(), learned: '', blockers: '', wins: '', mood: 3, energy: 3, tags: '' })

export default function LogPage() {
  const logs = useLiveQuery(() => db.logs.orderBy('date').reverse().toArray(), [], [])
  const [draft, setDraft] = useState<Draft>(blank())
  const [editing, setEditing] = useState<number | null>(null)
  const [q, setQ] = useState('')
  const [tag, setTag] = useState('')

  const allTags = useMemo(() => [...new Set(logs.flatMap((l) => l.tags))].sort(), [logs])
  const filtered = logs.filter((l) => {
    if (tag && !l.tags.includes(tag)) return false
    if (!q) return true
    return `${l.learned} ${l.blockers} ${l.wins} ${l.tags.join(' ')}`.toLowerCase().includes(q.toLowerCase())
  })

  const append = (k: 'learned' | 'blockers' | 'wins') => (t: string) =>
    setDraft((d) => ({ ...d, [k]: (d[k] ? d[k] + ' ' : '') + t }))

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.learned.trim() && !draft.blockers.trim() && !draft.wins.trim()) return
    const row: Omit<LogEntry, 'id'> = {
      date: draft.date,
      learned: draft.learned.trim(),
      blockers: draft.blockers.trim(),
      wins: draft.wins.trim(),
      mood: draft.mood,
      energy: draft.energy,
      tags: parseTags(draft.tags),
      createdAt: Date.now(),
    }
    if (editing) await db.logs.update(editing, row)
    else await db.logs.add(row)
    setDraft(blank())
    setEditing(null)
  }

  function edit(l: LogEntry) {
    setEditing(l.id!)
    setDraft({ date: l.date, learned: l.learned, blockers: l.blockers, wins: l.wins, mood: l.mood, energy: l.energy, tags: l.tags.join(', ') })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      <div className="page-h">
        <div>
          <h1>Journal</h1>
          <p className="sub">Capture what you learned, what blocked you, and what went well. Use 🎤 to dictate. Wrap code in ``` fences.</p>
        </div>
      </div>

      <div className="grid g2" style={{ alignItems: 'start' }}>
        <Card title={editing ? 'Edit entry' : 'New entry'}>
          <form className="form" onSubmit={save}>
            <label className="f">
              Date
              <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
            </label>
            {(['learned', 'blockers', 'wins'] as const).map((k) => (
              <label className="f" key={k}>
                <span className="row">
                  {k === 'learned' ? '📚 What I learned' : k === 'blockers' ? '🚧 Blockers' : '🏆 Wins'}
                  <DictateButton onText={append(k)} />
                </span>
                <textarea value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} />
              </label>
            ))}
            <div className="grid g2">
              <label className="f">
                Mood {EMOJI[draft.mood]}
                <input type="range" min={1} max={5} value={draft.mood} onChange={(e) => setDraft({ ...draft, mood: Number(e.target.value) })} />
              </label>
              <label className="f">
                Energy ⚡{draft.energy}
                <input type="range" min={1} max={5} value={draft.energy} onChange={(e) => setDraft({ ...draft, energy: Number(e.target.value) })} />
              </label>
            </div>
            <label className="f">
              Tags (comma separated)
              <input type="text" placeholder="react, algorithms, debugging" value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} />
            </label>
            <div className="row">
              <button className="btn">{editing ? 'Update entry' : 'Save entry'}</button>
              {editing && (
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => {
                    setEditing(null)
                    setDraft(blank())
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </Card>

        <Card title={`Entries (${filtered.length})`}>
          <div className="row" style={{ marginBottom: 12 }}>
            <input type="search" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1 }} />
            <select value={tag} onChange={(e) => setTag(e.target.value)} style={{ width: 140 }}>
              <option value="">All tags</option>
              {allTags.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          {filtered.length === 0 ? (
            <Empty>No entries yet.</Empty>
          ) : (
            <div className="list">
              {filtered.map((l) => (
                <div key={l.id} className="item">
                  <div className="top">
                    <div className="meta">
                      <strong style={{ color: 'var(--text)' }}>{prettyDate(l.date)}</strong>
                      <span>
                        {EMOJI[l.mood]} mood · ⚡{l.energy}
                      </span>
                      {l.tags.map((t) => (
                        <span key={t} className="pill">
                          #{t}
                        </span>
                      ))}
                    </div>
                    <div className="row" style={{ gap: 4 }}>
                      <button className="x" title="Edit" onClick={() => edit(l)}>
                        ✎
                      </button>
                      <button className="x" title="Delete" onClick={() => confirm('Delete this entry?') && db.logs.delete(l.id!)}>
                        ✕
                      </button>
                    </div>
                  </div>
                  {l.learned && (
                    <>
                      <div className="lbl">Learned</div>
                      <RichText text={l.learned} />
                    </>
                  )}
                  {l.blockers && (
                    <>
                      <div className="lbl">Blockers</div>
                      <RichText text={l.blockers} />
                    </>
                  )}
                  {l.wins && (
                    <>
                      <div className="lbl">Wins</div>
                      <RichText text={l.wins} />
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
