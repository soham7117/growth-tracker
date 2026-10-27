import { useState } from 'react'
import { confirmDialog } from '../components/Dialogs'
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from 'recharts'
import { db, type Skill } from '../db'
import { Card, Empty } from '../components/ui'
import { useSkills } from '../lib/hooks'
import { daysBetween, today } from '../lib/util'

const LEVELS = ['Unknown', 'Beginner', 'Learning', 'Comfortable', 'Strong', 'Expert']

const STARTERS = ['Data Structures', 'Algorithms', 'System Design', 'JavaScript / TypeScript', 'React', 'Databases / SQL', 'Git & Tooling', 'Testing']

export default function SkillsPage() {
  const skills = useSkills()
  const [name, setName] = useState('')
  const [parent, setParent] = useState<number | null>(null)

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    await db.skills.add({ name: name.trim(), parentId: parent, level: 0, createdAt: Date.now() })
    setName('')
  }

  async function remove(s: Skill) {
    const kids = skills.filter((x) => x.parentId === s.id)
    const ok = await confirmDialog({
      title: `Delete "${s.name}"?`,
      message: `${kids.length ? `Its ${kids.length} sub-skill(s) will be removed too. ` : ''}Logged sessions keep their time.`,
      confirmLabel: 'Delete skill',
      tone: 'danger',
    })
    if (!ok) return
    await db.transaction('rw', db.skills, async () => {
      for (const k of kids) await db.skills.delete(k.id!)
      await db.skills.delete(s.id!)
    })
  }

  async function addStarters() {
    const existing = new Set(skills.map((s) => s.name))
    await db.skills.bulkAdd(STARTERS.filter((n) => !existing.has(n)).map((n) => ({ name: n, parentId: null, level: 0, createdAt: Date.now() })))
  }

  const roots = skills.filter((s) => s.parentId === null)
  const radarData = (roots.length ? roots : skills).slice(0, 10).map((s) => ({ skill: s.name.length > 14 ? s.name.slice(0, 13) + '…' : s.name, level: s.level }))

  function Row({ s, depth }: { s: Skill; depth: number }) {
    const stale = s.lastPracticed ? daysBetween(s.lastPracticed, today()) : null
    return (
      <>
        <div className="skill" style={{ paddingLeft: depth * 22 }}>
          <div>
            <div className="nm">{depth > 0 && '↳ '}{s.name}</div>
            <div className="sub" style={{ margin: 0, fontSize: 12 }}>
              {LEVELS[s.level]} ·{' '}
              {stale === null ? 'never practiced' : stale === 0 ? 'practiced today' : `last practiced ${stale}d ago`}
            </div>
          </div>
          <div className="lvl">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} className={n <= s.level ? 'on' : ''} title={LEVELS[n]} onClick={() => db.skills.update(s.id!, { level: s.level === n ? n - 1 : n })} />
            ))}
          </div>
          <div className="row" style={{ gap: 4 }}>
            <button className="btn ghost small" onClick={() => db.skills.update(s.id!, { lastPracticed: today() })} title="Mark as practiced today">
              ✓ today
            </button>
            <button className="x" aria-label="Delete" onClick={() => remove(s)}>
              ✕
            </button>
          </div>
        </div>
        {skills.filter((k) => k.parentId === s.id).map((k) => (
          <Row key={k.id} s={k} depth={depth + 1} />
        ))}
      </>
    )
  }

  return (
    <>
      <div className="page-h">
        <div>
          <h1>Skills</h1>
          <p className="sub">Build your skills map. Click the squares to set your level (1–5). Time you log against a skill updates its “last practiced” date.</p>
        </div>
      </div>

      <div className="grid g2" style={{ alignItems: 'start' }}>
        <Card title="Skill tree">
          <form className="row" onSubmit={add} style={{ marginBottom: 12 }}>
            <input type="text" placeholder="New skill, e.g. Dynamic Programming" value={name} onChange={(e) => setName(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
            <select value={parent ?? ''} onChange={(e) => setParent(e.target.value ? Number(e.target.value) : null)} style={{ width: 150 }}>
              <option value="">Top level</option>
              {skills.filter((s) => s.parentId === null).map((s) => (
                <option key={s.id} value={s.id}>
                  under {s.name}
                </option>
              ))}
            </select>
            <button className="btn">Add</button>
          </form>
          {skills.length === 0 ? (
            <>
              <Empty>No skills yet.</Empty>
              <button className="btn ghost" onClick={addStarters}>
                Add starter skills
              </button>
            </>
          ) : (
            roots.map((s) => <Row key={s.id} s={s} depth={0} />)
          )}
        </Card>

        <Card title="Skill radar">
          {radarData.length < 3 ? (
            <Empty>Add at least 3 top-level skills to see the radar.</Empty>
          ) : (
            <div style={{ height: 340 }}>
              <ResponsiveContainer>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="skill" tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                  <PolarRadiusAxis domain={[0, 5]} tickCount={6} tick={false} axisLine={false} />
                  <Radar dataKey="level" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.45} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
