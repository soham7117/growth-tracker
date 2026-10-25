import { useMemo, type ReactNode } from 'react'
import { useDictation } from '../lib/speech'
import { addDays, dstr, today } from '../lib/util'
import type { Skill } from '../db'

export function Card({ title, right, children, className = '' }: { title?: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      {(title || right) && (
        <header className="card-h">
          <h3>{title}</h3>
          {right}
        </header>
      )}
      {children}
    </section>
  )
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="stat">
      <div className="stat-l">{label}</div>
      <div className="stat-v">{value}</div>
      {sub && <div className="stat-s">{sub}</div>}
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>
}

export function SkillSelect({
  skills,
  value,
  onChange,
  allowNone = true,
}: {
  skills: Skill[]
  value: number | null
  onChange: (v: number | null) => void
  allowNone?: boolean
}) {
  return (
    <select value={value ?? ''} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}>
      {allowNone && <option value="">No skill</option>}
      {skills.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  )
}

/** Mic button that appends dictated text via onText. Hidden if the browser lacks speech recognition. */
export function DictateButton({ onText, label = 'Dictate' }: { onText: (t: string) => void; label?: string }) {
  const d = useDictation(onText)
  if (!d.supported) return null
  return (
    <span className="dictate">
      <button type="button" className={`btn small ${d.listening ? 'rec' : 'ghost'}`} onClick={d.toggle} title="Voice dictation (browser built-in, no tokens)">
        {d.listening ? '● Stop' : `🎤 ${label}`}
      </button>
      {d.listening && d.interim && <em className="interim">{d.interim}</em>}
      {d.error && <em className="err">{d.error}</em>}
    </span>
  )
}

/** Tiny renderer: preserves line breaks and renders ``` fenced code blocks. */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/```/)
  return (
    <div className="rich">
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <pre key={i}>
            <code>{p.replace(/^\w*\n/, '')}</code>
          </pre>
        ) : (
          p && (
            <p key={i} style={{ whiteSpace: 'pre-wrap' }}>
              {p.trim()}
            </p>
          )
        )
      )}
    </div>
  )
}

export function Heatmap({ data, weeks = 26 }: { data: Record<string, number>; weeks?: number }) {
  const cells = useMemo(() => {
    const t = today()
    const end = new Date()
    const dow = end.getDay()
    // grid ends on this week's Saturday so columns align to weeks
    const lastCol = addDays(t, 6 - dow)
    const total = weeks * 7
    const out: { date: string; v: number; future: boolean }[] = []
    for (let i = total - 1; i >= 0; i--) {
      const date = addDays(lastCol, -i)
      out.push({ date, v: data[date] || 0, future: date > t })
    }
    return out
  }, [data, weeks])

  const level = (v: number) => (v === 0 ? 0 : v < 30 ? 1 : v < 60 ? 2 : v < 120 ? 3 : 4)

  return (
    <div className="heat" style={{ gridTemplateRows: 'repeat(7, 1fr)', gridAutoFlow: 'column' }}>
      {cells.map((c) => (
        <div key={c.date} className={`hc l${c.future ? 'f' : level(c.v)}`} title={`${c.date}: ${Math.round(c.v)} min`} />
      ))}
    </div>
  )
}

export function Progress({ value, max = 100 }: { value: number; max?: number }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="progress" title={`${pct}%`}>
      <div style={{ width: `${pct}%` }} />
    </div>
  )
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="tabs">
      {tabs.map((t) => (
        <button key={t.id} className={t.id === value ? 'active' : ''} onClick={() => onChange(t.id)}>
          {t.label}
        </button>
      ))}
    </div>
  )
}

export const todayStr = () => dstr(new Date())
