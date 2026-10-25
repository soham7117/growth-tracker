import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { db } from '../db'
import { Card, Empty, Stat, Tabs } from '../components/ui'
import { useSkills } from '../lib/hooks'
import { addDays, currentStreak, activeDates, fmtMinutes, longestStreak, today } from '../lib/util'
import { format, parseISO } from 'date-fns'

type Range = 'week' | 'month'

export default function InsightsPage() {
  const [range, setRange] = useState<Range>('week')
  const skills = useSkills()
  const sessions = useLiveQuery(() => db.sessions.toArray(), [], [])
  const logs = useLiveQuery(() => db.logs.toArray(), [], [])
  const problems = useLiveQuery(() => db.problems.toArray(), [], [])

  const days = range === 'week' ? 7 : 30
  const from = addDays(today(), -(days - 1))

  const r = useMemo(() => {
    const inRange = sessions.filter((s) => s.date >= from)
    const total = inRange.reduce((a, s) => a + s.minutes, 0)

    const perDay = Array.from({ length: days }, (_, i) => {
      const d = addDays(from, i)
      return { date: d, label: format(parseISO(d), days === 7 ? 'EEE' : 'd MMM'), minutes: Math.round(inRange.filter((s) => s.date === d).reduce((a, s) => a + s.minutes, 0)) }
    })

    const bySkill: Record<string, number> = {}
    for (const s of inRange) {
      const n = skills.find((x) => x.id === s.skillId)?.name ?? 'Unassigned'
      bySkill[n] = (bySkill[n] || 0) + s.minutes
    }
    const skillRows = Object.entries(bySkill)
      .map(([name, minutes]) => ({ name, hours: Math.round((minutes / 60) * 10) / 10, minutes }))
      .sort((a, b) => b.minutes - a.minutes)

    const byHour = Array(24).fill(0) as number[]
    for (const s of sessions) byHour[new Date(s.start).getHours()] += s.minutes
    const best = byHour.indexOf(Math.max(...byHour))
    const hasHours = byHour[best] > 0

    const logsIn = logs.filter((l) => l.date >= from).sort((a, b) => a.date.localeCompare(b.date))
    const moodRows = logsIn.map((l) => ({ label: format(parseISO(l.date), 'd MMM'), mood: l.mood, energy: l.energy }))

    const solved = problems.filter((p) => p.date >= from)
    const active = activeDates(sessions, logs)
    const activeDays = perDay.filter((d) => d.minutes > 0).length

    return { total, perDay, skillRows, best, hasHours, moodRows, solved, active, activeDays, entries: logsIn.length }
  }, [sessions, logs, problems, skills, from, days])

  const hourLabel = (h: number) => `${((h + 11) % 12) + 1}${h < 12 ? 'am' : 'pm'}`

  return (
    <>
      <div className="page-h">
        <div>
          <h1>Insights</h1>
          <p className="sub">Weekly and monthly report, calculated from your own data.</p>
        </div>
        <Tabs<Range>
          tabs={[
            { id: 'week', label: 'Last 7 days' },
            { id: 'month', label: 'Last 30 days' },
          ]}
          value={range}
          onChange={setRange}
        />
      </div>

      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Card>
          <Stat label="Focus time" value={fmtMinutes(r.total)} sub={`${fmtMinutes(r.total / days)} / day avg`} />
        </Card>
        <Card>
          <Stat label="Active days" value={`${r.activeDays}/${days}`} sub={`streak ${currentStreak(r.active)}d · best ${longestStreak(r.active)}d`} />
        </Card>
        <Card>
          <Stat label="Problems" value={r.solved.length} sub={`${r.solved.filter((p) => p.solved).length} solved clean`} />
        </Card>
        <Card>
          <Stat label="Best time of day" value={r.hasHours ? hourLabel(r.best) : '—'} sub="most focus minutes (all-time)" />
        </Card>
      </div>

      <div className="grid g2">
        <Card title="Minutes per day">
          <div style={{ height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={r.perDay}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: 'var(--muted)', fontSize: 12 }} interval={days === 7 ? 0 : 4} />
                <YAxis tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8 }} />
                <Bar dataKey="minutes" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Hours by skill">
          {r.skillRows.length === 0 ? (
            <Empty>No sessions in this period.</Empty>
          ) : (
            <div style={{ height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={r.skillRows} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8 }} />
                  <Bar dataKey="hours" fill="var(--accent2)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title="Mood & energy" className="span2">
          {r.moodRows.length < 2 ? (
            <Empty>Write at least two journal entries in this period to see trends.</Empty>
          ) : (
            <div style={{ height: 240 }}>
              <ResponsiveContainer>
                <LineChart data={r.moodRows}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                  <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8 }} />
                  <Legend />
                  <Line type="monotone" dataKey="mood" stroke="var(--accent)" strokeWidth={2} dot />
                  <Line type="monotone" dataKey="energy" stroke="var(--warn)" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
