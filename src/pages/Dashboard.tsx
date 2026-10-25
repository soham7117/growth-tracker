import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { Card, DictateButton, Empty, Heatmap, Progress, RichText, SkillSelect, Stat } from '../components/ui'
import { useSkills } from '../lib/hooks'
import { buildNudges } from '../lib/insights'
import { useSettings } from '../lib/settings'
import { timer } from '../lib/timer'
import { activeDates, addDays, currentStreak, fmtMinutes, longestStreak, minutesByDate, prettyDate, today } from '../lib/util'

export default function Dashboard() {
  const nav = useNavigate()
  const s = useSettings()
  const skills = useSkills()
  const sessions = useLiveQuery(() => db.sessions.toArray(), [], [])
  const logs = useLiveQuery(() => db.logs.orderBy('date').reverse().toArray(), [], [])
  const cards = useLiveQuery(() => db.flashcards.toArray(), [], [])
  const problems = useLiveQuery(() => db.problems.toArray(), [], [])
  const [skillId, setSkillId] = useState<number | null>(null)
  const [voice, setVoice] = useState('')
  const [saved, setSaved] = useState(false)

  const d = useMemo(() => {
    const byDate = minutesByDate(sessions)
    const active = activeDates(sessions, logs)
    const t = today()
    const week = Array.from({ length: 7 }, (_, i) => byDate[addDays(t, -i)] || 0).reduce((a, b) => a + b, 0)
    return { byDate, active, todayMin: byDate[t] || 0, week, streak: currentStreak(active), best: longestStreak(active) }
  }, [sessions, logs])

  const nudges = useMemo(
    () => buildNudges({ skills, sessions, logs, cards, problems, goalMin: s.dailyGoalMin }),
    [skills, sessions, logs, cards, problems, s.dailyGoalMin]
  )
  const dueCards = cards.filter((c) => c.due <= today()).length

  function startFocus() {
    timer.setSkill(skillId)
    nav('/timer')
    setTimeout(() => timer.start(), 0)
  }

  async function saveVoice() {
    if (!voice.trim()) return
    await db.logs.add({ date: today(), learned: voice.trim(), blockers: '', wins: '', mood: 3, energy: 3, tags: ['voice'], createdAt: Date.now() })
    setVoice('')
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <>
      <div className="page-h">
        <div>
          <h1>{greet} 👋</h1>
          <p className="sub">Small, consistent steps compound. Here's where you stand.</p>
        </div>
        <div className="row">
          <SkillSelect skills={skills} value={skillId} onChange={setSkillId} />
          <button className="btn" onClick={startFocus}>
            ▶ Start focus
          </button>
        </div>
      </div>

      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Card>
          <Stat label="Today" value={fmtMinutes(d.todayMin)} sub={`goal ${fmtMinutes(s.dailyGoalMin)}`} />
          <div style={{ marginTop: 8 }}>
            <Progress value={d.todayMin} max={s.dailyGoalMin} />
          </div>
        </Card>
        <Card>
          <Stat label="Streak" value={`${d.streak} 🔥`} sub={`best ${d.best} days`} />
        </Card>
        <Card>
          <Stat label="This week" value={fmtMinutes(d.week)} sub="last 7 days" />
        </Card>
        <Card>
          <Stat label="Cards due" value={dueCards} sub={dueCards ? 'go to Review' : 'all caught up'} />
        </Card>
      </div>

      <div className="grid g2" style={{ marginBottom: 16, alignItems: 'start' }}>
        <Card title="Activity (last 26 weeks)" className="span2">
          <Heatmap data={d.byDate} />
        </Card>

        <Card title="🎤 Quick voice log" right={saved ? <span className="pill ok">saved ✓</span> : undefined}>
          <textarea
            placeholder="Click the mic and say what you learned today, or just type…"
            value={voice}
            onChange={(e) => setVoice(e.target.value)}
          />
          <div className="row" style={{ marginTop: 10, justifyContent: 'space-between' }}>
            <DictateButton onText={(t) => setVoice((v) => (v ? v + ' ' : '') + t)} label="Speak" />
            <button className="btn small" onClick={saveVoice} disabled={!voice.trim()}>
              Save to journal
            </button>
          </div>
        </Card>

        <Card title="Nudges">
          {nudges.length === 0 ? (
            <Empty>All good — nothing needs attention.</Empty>
          ) : (
            nudges.map((n, i) => (
              <div className="nudge" key={i}>
                <span>{n.icon}</span>
                <span style={{ color: n.tone === 'warn' ? 'var(--warn)' : n.tone === 'good' ? 'var(--accent2)' : 'var(--text)' }}>{n.text}</span>
              </div>
            ))
          )}
        </Card>

        <Card title="Recent journal" className="span2">
          {logs.length === 0 ? (
            <Empty>No entries yet — write your first one in the Journal.</Empty>
          ) : (
            <div className="list">
              {logs.slice(0, 3).map((l) => (
                <div className="item" key={l.id}>
                  <div className="meta">
                    <strong style={{ color: 'var(--text)' }}>{prettyDate(l.date)}</strong>
                    {l.tags.map((t) => (
                      <span className="pill" key={t}>
                        #{t}
                      </span>
                    ))}
                  </div>
                  <RichText text={l.learned || l.wins || l.blockers} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
