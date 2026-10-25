import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Goal } from '../db'
import { Card, Empty, Progress } from '../components/ui'
import { quarterOf } from '../lib/util'

export default function GoalsPage() {
  const goals = useLiveQuery(async () => (await db.goals.toArray()).sort((a, b) => b.createdAt - a.createdAt), [], [])
  const milestones = useLiveQuery(() => db.milestones.toArray(), [], [])
  const [title, setTitle] = useState('')
  const [quarter, setQuarter] = useState(quarterOf())

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    await db.goals.add({ title: title.trim(), quarter, done: false, createdAt: Date.now() })
    setTitle('')
  }

  const byQuarter = goals.reduce<Record<string, Goal[]>>((acc, g) => {
    ;(acc[g.quarter] ||= []).push(g)
    return acc
  }, {})

  return (
    <>
      <div className="page-h">
        <div>
          <h1>Goals &amp; roadmap</h1>
          <p className="sub">Set quarterly goals and break them into weekly milestones.</p>
        </div>
      </div>

      <Card title="New goal">
        <form className="row" onSubmit={add}>
          <input type="text" placeholder="e.g. Solve 100 DSA problems" value={title} onChange={(e) => setTitle(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
          <input type="text" value={quarter} onChange={(e) => setQuarter(e.target.value)} style={{ width: 110 }} title="Quarter label" />
          <button className="btn">Add goal</button>
        </form>
      </Card>

      <div style={{ height: 16 }} />

      {goals.length === 0 && <Empty>No goals yet. Add your first one above.</Empty>}

      {Object.keys(byQuarter)
        .sort()
        .reverse()
        .map((q) => (
          <div key={q} style={{ marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 10px', color: 'var(--muted)' }}>{q}</h3>
            <div className="grid g2">
              {byQuarter[q].map((g) => (
                <GoalCard key={g.id} goal={g} ms={milestones.filter((m) => m.goalId === g.id)} />
              ))}
            </div>
          </div>
        ))}
    </>
  )
}

function GoalCard({ goal, ms }: { goal: Goal; ms: { id?: number; title: string; week: string; done: boolean }[] }) {
  const [t, setT] = useState('')
  const [week, setWeek] = useState('')
  const done = ms.filter((m) => m.done).length
  const pct = ms.length ? done : goal.done ? 1 : 0
  const max = ms.length || 1

  async function addMs(e: React.FormEvent) {
    e.preventDefault()
    if (!t.trim()) return
    await db.milestones.add({ goalId: goal.id!, title: t.trim(), week, done: false })
    setT('')
  }

  async function remove() {
    if (!confirm(`Delete goal "${goal.title}" and its milestones?`)) return
    await db.milestones.where('goalId').equals(goal.id!).delete()
    await db.goals.delete(goal.id!)
  }

  return (
    <Card
      title={goal.title}
      right={
        <div className="row" style={{ gap: 6 }}>
          <label className="chk">
            <input type="checkbox" checked={goal.done} onChange={(e) => db.goals.update(goal.id!, { done: e.target.checked })} /> done
          </label>
          <button className="x" onClick={remove}>
            ✕
          </button>
        </div>
      }
    >
      <Progress value={pct} max={max} />
      <p className="sub" style={{ fontSize: 12 }}>
        {ms.length ? `${done}/${ms.length} milestones` : 'No milestones yet'}
      </p>
      <div className="list" style={{ marginBottom: 10 }}>
        {ms
          .slice()
          .sort((a, b) => a.week.localeCompare(b.week))
          .map((m) => (
            <div key={m.id} className="row" style={{ justifyContent: 'space-between' }}>
              <label className="chk" style={{ textDecoration: m.done ? 'line-through' : 'none', opacity: m.done ? 0.6 : 1 }}>
                <input type="checkbox" checked={m.done} onChange={(e) => db.milestones.update(m.id!, { done: e.target.checked })} />
                {m.title}
                {m.week && <span className="pill">{m.week}</span>}
              </label>
              <button className="x" onClick={() => db.milestones.delete(m.id!)}>
                ✕
              </button>
            </div>
          ))}
      </div>
      <form className="row" onSubmit={addMs}>
        <input type="text" placeholder="Add milestone" value={t} onChange={(e) => setT(e.target.value)} style={{ flex: 1, minWidth: 120 }} />
        <input type="text" placeholder="Week (e.g. W3)" value={week} onChange={(e) => setWeek(e.target.value)} style={{ width: 110 }} />
        <button className="btn small">Add</button>
      </form>
    </Card>
  )
}
