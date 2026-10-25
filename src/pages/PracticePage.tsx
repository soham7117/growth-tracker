import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, touchSkill, type Problem, type Project, type Resource } from '../db'
import { Card, DictateButton, Empty, SkillSelect, Tabs } from '../components/ui'
import { useSkills } from '../lib/hooks'
import { addDays, prettyDate, today } from '../lib/util'

type Tab = 'problems' | 'projects' | 'resources'

export default function PracticePage() {
  const [tab, setTab] = useState<Tab>('problems')
  return (
    <>
      <div className="page-h">
        <div>
          <h1>Practice log</h1>
          <p className="sub">Problems you solved, projects &amp; PRs you shipped, and things you read or watched.</p>
        </div>
        <Tabs<Tab>
          tabs={[
            { id: 'problems', label: 'Problems' },
            { id: 'projects', label: 'Projects & PRs' },
            { id: 'resources', label: 'Reading & videos' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>
      {tab === 'problems' && <Problems />}
      {tab === 'projects' && <Projects />}
      {tab === 'resources' && <Resources />}
    </>
  )
}

function Problems() {
  const skills = useSkills()
  const items = useLiveQuery(() => db.problems.orderBy('date').reverse().toArray(), [], [])
  const [f, setF] = useState({ title: '', platform: 'LeetCode', difficulty: 'Medium' as Problem['difficulty'], minutes: 30, hints: 0, solved: true, skillId: null as number | null, retryDate: '', notes: '' })

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!f.title.trim()) return
    const retry = f.retryDate || (!f.solved || f.hints > 0 ? addDays(today(), 7) : '')
    await db.problems.add({ ...f, title: f.title.trim(), retryDate: retry, date: today() })
    await touchSkill(f.skillId, today())
    setF({ ...f, title: '', notes: '', hints: 0, retryDate: '' })
  }

  return (
    <div className="grid g2" style={{ alignItems: 'start' }}>
      <Card title="Log a problem">
        <form className="form" onSubmit={add}>
          <input type="text" placeholder="Problem title / link" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <div className="grid g2">
            <input type="text" placeholder="Platform" value={f.platform} onChange={(e) => setF({ ...f, platform: e.target.value })} />
            <select value={f.difficulty} onChange={(e) => setF({ ...f, difficulty: e.target.value as Problem['difficulty'] })}>
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
            </select>
            <label className="f">
              Minutes taken
              <input type="number" min={0} value={f.minutes} onChange={(e) => setF({ ...f, minutes: Number(e.target.value) })} />
            </label>
            <label className="f">
              Hints used
              <input type="number" min={0} value={f.hints} onChange={(e) => setF({ ...f, hints: Number(e.target.value) })} />
            </label>
          </div>
          <SkillSelect skills={skills} value={f.skillId} onChange={(v) => setF({ ...f, skillId: v })} />
          <label className="chk">
            <input type="checkbox" checked={f.solved} onChange={(e) => setF({ ...f, solved: e.target.checked })} /> Solved on my own
          </label>
          <label className="f">
            Retry on (auto +7 days if unsolved or hints used)
            <input type="date" value={f.retryDate} onChange={(e) => setF({ ...f, retryDate: e.target.value })} />
          </label>
          <label className="f">
            <span className="row">
              Notes / approach
              <DictateButton onText={(t) => setF((x) => ({ ...x, notes: (x.notes ? x.notes + ' ' : '') + t }))} />
            </span>
            <textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
          </label>
          <button className="btn">Save problem</button>
        </form>
      </Card>
      <Card title={`Problems (${items.length})`}>
        {items.length === 0 ? (
          <Empty>Nothing logged yet.</Empty>
        ) : (
          <div className="list">
            {items.map((p) => (
              <div key={p.id} className="item">
                <div className="top">
                  <strong>{p.title}</strong>
                  <button className="x" onClick={() => db.problems.delete(p.id!)}>
                    ✕
                  </button>
                </div>
                <div className="meta">
                  <span>{prettyDate(p.date)}</span>
                  <span className="pill">{p.platform}</span>
                  <span className={`pill ${p.difficulty === 'Easy' ? 'ok' : p.difficulty === 'Hard' ? 'bad' : 'warn'}`}>{p.difficulty}</span>
                  <span>{p.minutes}m</span>
                  {p.hints > 0 && <span>{p.hints} hint(s)</span>}
                  <span className={`pill ${p.solved ? 'ok' : 'bad'}`}>{p.solved ? 'solved' : 'unsolved'}</span>
                  {p.retryDate && (
                    <span className={`pill ${p.retryDate <= today() ? 'warn' : ''}`}>
                      retry {p.retryDate}
                      <button className="x" style={{ fontSize: 12, marginLeft: 4 }} title="Mark retried" onClick={() => db.problems.update(p.id!, { retryDate: '' })}>
                        ✓
                      </button>
                    </span>
                  )}
                </div>
                {p.notes && <p style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>{p.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function Projects() {
  const items = useLiveQuery(() => db.projects.orderBy('date').reverse().toArray(), [], [])
  const [f, setF] = useState({ title: '', url: '', type: 'project' as Project['type'], reflection: '' })

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!f.title.trim()) return
    await db.projects.add({ ...f, title: f.title.trim(), date: today() })
    setF({ ...f, title: '', url: '', reflection: '' })
  }

  return (
    <div className="grid g2" style={{ alignItems: 'start' }}>
      <Card title="Log a project or PR">
        <form className="form" onSubmit={add}>
          <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as Project['type'] })}>
            <option value="project">Project</option>
            <option value="pr">Pull request</option>
          </select>
          <input type="text" placeholder="Title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <input type="url" placeholder="Link (GitHub, demo…)" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} />
          <label className="f">
            <span className="row">
              What I'd do differently
              <DictateButton onText={(t) => setF((x) => ({ ...x, reflection: (x.reflection ? x.reflection + ' ' : '') + t }))} />
            </span>
            <textarea value={f.reflection} onChange={(e) => setF({ ...f, reflection: e.target.value })} />
          </label>
          <button className="btn">Save</button>
        </form>
      </Card>
      <Card title={`Projects & PRs (${items.length})`}>
        {items.length === 0 ? (
          <Empty>Nothing yet.</Empty>
        ) : (
          <div className="list">
            {items.map((p) => (
              <div key={p.id} className="item">
                <div className="top">
                  <strong>{p.url ? <a href={p.url} target="_blank" rel="noreferrer">{p.title}</a> : p.title}</strong>
                  <button className="x" onClick={() => db.projects.delete(p.id!)}>
                    ✕
                  </button>
                </div>
                <div className="meta">
                  <span>{prettyDate(p.date)}</span>
                  <span className="pill">{p.type === 'pr' ? 'PR' : 'project'}</span>
                </div>
                {p.reflection && <p style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>{p.reflection}</p>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function Resources() {
  const items = useLiveQuery(() => db.resources.orderBy('date').reverse().toArray(), [], [])
  const [f, setF] = useState({ title: '', kind: 'article' as Resource['kind'], takeaway: '' })

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!f.title.trim()) return
    await db.resources.add({ ...f, title: f.title.trim(), date: today() })
    setF({ ...f, title: '', takeaway: '' })
  }

  return (
    <div className="grid g2" style={{ alignItems: 'start' }}>
      <Card title="Log something you read or watched">
        <form className="form" onSubmit={add}>
          <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as Resource['kind'] })}>
            <option value="article">Article</option>
            <option value="video">Video</option>
            <option value="book">Book</option>
            <option value="course">Course</option>
          </select>
          <input type="text" placeholder="Title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <label className="f">
            <span className="row">
              One-line takeaway
              <DictateButton onText={(t) => setF((x) => ({ ...x, takeaway: (x.takeaway ? x.takeaway + ' ' : '') + t }))} />
            </span>
            <input type="text" value={f.takeaway} onChange={(e) => setF({ ...f, takeaway: e.target.value })} />
          </label>
          <button className="btn">Save</button>
        </form>
      </Card>
      <Card title={`Reading & videos (${items.length})`}>
        {items.length === 0 ? (
          <Empty>Nothing yet.</Empty>
        ) : (
          <div className="list">
            {items.map((r) => (
              <div key={r.id} className="item">
                <div className="top">
                  <strong>{r.title}</strong>
                  <button className="x" onClick={() => db.resources.delete(r.id!)}>
                    ✕
                  </button>
                </div>
                <div className="meta">
                  <span>{prettyDate(r.date)}</span>
                  <span className="pill">{r.kind}</span>
                </div>
                {r.takeaway && <p style={{ margin: '8px 0 0' }}>💡 {r.takeaway}</p>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
