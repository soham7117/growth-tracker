import { NavLink } from 'react-router-dom'
import { useNow } from '../lib/hooks'
import { elapsedMs, useTimer } from '../lib/timer'
import { fmtDuration, timeAgo } from '../lib/util'
import { signOut, useSession } from '../lib/cloud/auth'
import { useCloudSettings } from '../lib/cloud/settings'
import { useSyncStatus } from '../lib/cloud/status'
import { confirmDialog, toast } from './Dialogs'
import { ROUTES } from '../routes'

function MiniTimer() {
  const t = useTimer()
  const now = useNow(500)
  const el = elapsedMs(t, now)
  const shown = t.targetMs ? t.targetMs - el : el
  const active = t.running || t.accMs > 0
  return (
    <NavLink to="/timer" className={`mini ${t.running ? 'run' : ''}`}>
      <div className="t">{fmtDuration(shown / 1000)}</div>
      <div className="s">{!active ? 'Timer idle' : t.running ? (t.phase === 'focus' ? 'Focusing…' : 'On break') : 'Paused'}</div>
    </NavLink>
  )
}

function CloudChip() {
  const cs = useCloudSettings()
  const session = useSession()
  const status = useSyncStatus()
  useNow(30000) // keep "synced 2 min ago" fresh
  if (!cs.enabled || !session) return null
  const bad = status.phase === 'conflict' || status.phase === 'error'
  const text =
    status.phase === 'conflict'
      ? '☁️ Sync needs attention'
      : status.phase === 'error'
        ? '☁️ Sync problem'
        : cs.lastSyncedAt
          ? `☁️ Synced ${timeAgo(cs.lastSyncedAt)}`
          : '☁️ Signed in'
  return (
    <div className="cloud-box">
      <NavLink to="/settings" className={`mini cloud ${bad ? 'warn' : ''}`} title="Open cloud sync settings">
        <div className="s">{text}</div>
      </NavLink>
      <button
        className="btn ghost small signout"
        onClick={async () => {
          const ok = await confirmDialog({ title: 'Sign out?', message: 'Your data stays on this device. You can sign back in any time from Settings.', confirmLabel: 'Sign out' })
          if (!ok) return
          try {
            await signOut()
            toast('Signed out.', 'success')
          } catch {
            toast('Could not sign out. Check your connection and try again.', 'error')
          }
        }}
      >
        Sign out
      </button>
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className="side">
      <div className="brand">
        <span aria-hidden="true">▲</span> Growth Tracker
      </div>
      <nav className="side-nav" aria-label="Main">
        {ROUTES.map((r) => (
          <NavLink key={r.path} to={r.path} end={r.path === '/'} className={({ isActive }) => `nav ${isActive ? 'active' : ''}`}>
            <span aria-hidden="true">{r.icon}</span>
            {r.label}
          </NavLink>
        ))}
      </nav>
      <div className="grow" />
      <CloudChip />
      <MiniTimer />
    </aside>
  )
}

export function MobileNav() {
  return (
    <nav className="mobile-nav" aria-label="Main">
      {ROUTES.map((r) => (
        <NavLink key={r.path} to={r.path} end={r.path === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
          <span aria-hidden="true">{r.icon}</span>
          <span>{r.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
