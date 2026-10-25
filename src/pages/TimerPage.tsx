import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { Card, Empty, SkillSelect, Tabs } from '../components/ui'
import { useNow, useSkills } from '../lib/hooks'
import { useSettings } from '../lib/settings'
import { elapsedMs, timer, useTimer, type Mode } from '../lib/timer'
import { fmtDuration, fmtMinutes, today } from '../lib/util'

export default function TimerPage() {
  const t = useTimer()
  const s = useSettings()
  const now = useNow(250)
  const skills = useSkills()
  const todays = useLiveQuery(() => db.sessions.where('date').equals(today()).reverse().sortBy('start'), [], [])

  const el = elapsedMs(t, now)
  const remaining = t.targetMs ? Math.max(0, t.targetMs - el) : 0
  const shownSec = (t.targetMs ? remaining : el) / 1000
  const frac = t.targetMs ? Math.min(1, el / t.targetMs) : (el / 3600000) % 1
  const started = t.running || t.accMs > 0
  const R = 140
  const C = 2 * Math.PI * R
  const skillName = (id: number | null) => skills.find((x) => x.id === id)?.name ?? '—'
  const todayMin = todays.reduce((a, b) => a + b.minutes, 0)

  return (
    <>
      <div className="page-h">
        <div>
          <h1>Timer</h1>
          <p className="sub">Focus sessions are logged automatically. Today: {fmtMinutes(todayMin)} of {fmtMinutes(s.dailyGoalMin)} goal.</p>
        </div>
        <Tabs<Mode>
          tabs={[
            { id: 'pomodoro', label: 'Pomodoro' },
            { id: 'stopwatch', label: 'Stopwatch' },
            { id: 'countdown', label: 'Countdown' },
          ]}
          value={t.mode}
          onChange={(m) => timer.setMode(m)}
        />
      </div>

      <div className="grid g2">
        <Card>
          <div className={`clock ${t.phase === 'focus' ? 'focus' : 'brk'}`}>
            <div className="phase">
              {t.phase === 'focus' ? (t.mode === 'pomodoro' ? `Focus · cycle ${t.cycles + 1}` : 'Focus') : t.phase === 'short' ? 'Short break' : 'Long break'}
            </div>
            <div className="ring">
              <svg viewBox="0 0 320 320">
                <circle cx="160" cy="160" r={R} fill="none" stroke="var(--panel2)" strokeWidth="14" />
                <circle
                  cx="160"
                  cy="160"
                  r={R}
                  fill="none"
                  stroke={t.phase === 'focus' ? 'var(--accent)' : 'var(--accent2)'}
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={C}
                  strokeDashoffset={C * (1 - frac)}
                />
              </svg>
              <div className="inner">
                <div className="big">{fmtDuration(shownSec)}</div>
              </div>
            </div>
          </div>

          <div className="row" style={{ justifyContent: 'center', marginTop: 18 }}>
            {!t.running ? (
              <button className="btn" onClick={() => timer.start()}>
                {started ? '▶ Resume' : '▶ Start'}
              </button>
            ) : (
              <button className="btn ghost" onClick={() => timer.pause()}>
                ⏸ Pause
              </button>
            )}
            {t.phase === 'focus' && started && (
              <button className="btn good" onClick={() => timer.finish()} title="Stop now and save the time worked">
                ✔ Finish &amp; log
              </button>
            )}
            {t.phase !== 'focus' && (
              <button className="btn ghost" onClick={() => timer.skipBreak()}>
                Skip break
              </button>
            )}
            <button className="btn danger" onClick={() => timer.reset()} disabled={!started}>
              Reset
            </button>
          </div>

          <div className="form" style={{ marginTop: 18 }}>
            <label className="f">
              Working on
              <SkillSelect skills={skills} value={t.skillId} onChange={(v) => timer.setSkill(v)} />
            </label>
            {t.mode === 'countdown' && (
              <label className="f">
                Countdown minutes
                <input type="number" min={1} max={600} value={t.countdownMin} disabled={t.running || started} onChange={(e) => timer.setCountdownMin(Number(e.target.value))} />
              </label>
            )}
            {t.mode === 'pomodoro' && (
              <p className="sub">
                {s.focusMin} min focus · {s.shortBreakMin} min break · {s.longBreakMin} min long break every 4 cycles. Change in Settings.
              </p>
            )}
            <p className="sub">Keep this tab open (or installed as an app) so the alarm can ring. The timer survives page refreshes.</p>
          </div>
        </Card>

        <Card title="Today's sessions">
          {todays.length === 0 ? (
            <Empty>No sessions yet today. Start the timer!</Empty>
          ) : (
            <div className="list">
              {todays.map((x) => (
                <div className="item" key={x.id}>
                  <div className="top">
                    <div>
                      <strong>{fmtMinutes(x.minutes)}</strong> · {skillName(x.skillId)}
                      <div className="meta">
                        <span>{new Date(x.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="pill">{x.kind}</span>
                      </div>
                    </div>
                    <button className="x" title="Delete" onClick={() => db.sessions.delete(x.id!)}>
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <ManualEntry />
        </Card>
      </div>
    </>
  )
}

function ManualEntry() {
  const skills = useSkills()
  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const minutes = Number(f.get('m'))
    if (!minutes) return
    const skill = f.get('skill') ? Number(f.get('skill')) : null
    await db.sessions.add({ start: Date.now(), minutes, kind: 'stopwatch', skillId: skill, date: today() })
    e.currentTarget.reset()
  }
  return (
    <form onSubmit={add} className="row" style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
      <span className="sub" style={{ margin: 0 }}>
        Forgot to start?
      </span>
      <input name="m" type="number" min={1} placeholder="min" style={{ width: 80 }} />
      <select name="skill" style={{ width: 150 }}>
        <option value="">No skill</option>
        {skills.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <button className="btn small">Add time</button>
    </form>
  )
}
