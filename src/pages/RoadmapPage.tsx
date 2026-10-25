import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { Card, Progress } from '../components/ui'
import { QuizModal } from '../components/QuizModal'
import { PYTHON_ROADMAP, type RoadmapItem, type RoadmapSection } from '../data/pythonRoadmap'

export default function RoadmapPage() {
  const rows = useLiveQuery(() => db.roadmap.toArray(), [], [])
  const done = useMemo(() => new Set(rows.filter((r) => r.done).map((r) => r.id)), [rows])
  const [hideDone, setHideDone] = useState(false)
  const [open, setOpen] = useState<Record<string, boolean>>({})

  const total = PYTHON_ROADMAP.reduce((a, s) => a + s.items.length, 0)
  const doneCount = PYTHON_ROADMAP.reduce((a, s) => a + s.items.filter((i) => done.has(i.id)).length, 0)

  const [modal, setModal] = useState<{ item: RoadmapItem; startAt: 'quiz' | 'practice' } | null>(null)

  // Completing a topic requires passing its quiz; un-ticking is instant.
  const toggle = (item: RoadmapItem) => (done.has(item.id) ? db.roadmap.delete(item.id) : setModal({ item, startAt: 'quiz' }))

  const clearSection = (s: RoadmapSection) => db.roadmap.bulkDelete(s.items.map((i) => i.id))

  const isOpen = (id: string) => open[id] ?? true

  return (
    <>
      <div className="page-h">
        <div>
          <h1>Python roadmap 🐍</h1>
          <p className="sub">
            Your checklist for the{' '}
            <a href="https://roadmap.sh/python" target="_blank" rel="noreferrer">
              roadmap.sh Python Developer path
            </a>
            , in the same order. Click a topic to take its quick quiz; pass it to tick it off, then practice with free LeetCode / GFG problems.
          </p>
        </div>
        <div className="row">
          <label className="chk">
            <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} /> Hide completed
          </label>
          <button className="btn ghost small" onClick={() => setOpen(Object.fromEntries(PYTHON_ROADMAP.map((s) => [s.id, false])))}>
            Collapse all
          </button>
          <button className="btn ghost small" onClick={() => setOpen({})}>
            Expand all
          </button>
        </div>
      </div>

      <Card className="rm-overall">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
          <strong>Overall progress</strong>
          <span>
            {doneCount} / {total} topics · {Math.round((doneCount / total) * 100)}%
          </span>
        </div>
        <Progress value={doneCount} max={total} />
      </Card>

      <div className="rm-flow">
        {PYTHON_ROADMAP.map((s, idx) => {
          const n = s.items.filter((i) => done.has(i.id)).length
          const complete = n === s.items.length
          const groups = [...new Set(s.items.map((i) => i.group ?? ''))]
          return (
            <div key={s.id} className={`rm-step ${complete ? 'complete' : ''}`}>
              <div className="rm-num">{complete ? '✓' : idx + 1}</div>
              <Card
                title={s.title}
                right={
                  <div className="row" style={{ gap: 8 }}>
                    <span className={`pill ${complete ? 'ok' : ''}`}>
                      {n}/{s.items.length}
                    </span>
                    {n > 0 && (
                      <button className="btn ghost small" onClick={() => confirm(`Clear progress for "${s.title}"?`) && clearSection(s)}>
                        Clear
                      </button>
                    )}
                    <button className="x" title="Collapse / expand" onClick={() => setOpen({ ...open, [s.id]: !isOpen(s.id) })}>
                      {isOpen(s.id) ? '▾' : '▸'}
                    </button>
                  </div>
                }
              >
                <Progress value={n} max={s.items.length} />
                {isOpen(s.id) &&
                  groups.map((g) => {
                    const items = s.items.filter((i) => (i.group ?? '') === g && !(hideDone && done.has(i.id)))
                    if (!items.length) return null
                    return (
                      <div key={g} style={{ marginTop: 12 }}>
                        {g && <div className="lbl" style={{ marginTop: 0 }}>{g}</div>}
                        <div className="rm-items">
                          {items.map((i) => (
                            <div
                              key={i.id}
                              className={`rm-item ${done.has(i.id) ? 'done' : ''}`}
                              role="checkbox"
                              aria-checked={done.has(i.id)}
                              tabIndex={0}
                              onClick={() => toggle(i)}
                              onKeyDown={(e) => {
                                if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                                  e.preventDefault()
                                  toggle(i)
                                }
                              }}
                            >
                              <input type="checkbox" checked={done.has(i.id)} onChange={() => {}} tabIndex={-1} aria-hidden="true" />
                              <span className="name">{i.label}</span>
                              {done.has(i.id) && (
                                <button
                                  className="pr"
                                  title="Practice this concept"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setModal({ item: i, startAt: 'practice' })
                                  }}
                                >
                                  🧩
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
              </Card>
            </div>
          )
        })}
      </div>

      {modal && (
        <QuizModal
          key={modal.item.id + modal.startAt}
          itemId={modal.item.id}
          label={modal.item.label}
          startAt={modal.startAt}
          onPass={() => db.roadmap.put({ id: modal.item.id, done: true, doneAt: Date.now() })}
          onClose={() => setModal(null)}
        />
      )}
    </>
  )
}
