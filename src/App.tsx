import { Suspense, lazy, useEffect } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { useBackgroundLoop, useNow } from './lib/hooks'
import { useSettings } from './lib/settings'
import { elapsedMs, useTimer } from './lib/timer'
import { fmtDuration } from './lib/util'
import ErrorBoundary from './components/ErrorBoundary'
import { useAutoSync } from './lib/cloud/autosync'
import Dashboard from './pages/Dashboard'

// Route-level code splitting keeps the heavy chart library out of the initial bundle.
const TimerPage = lazy(() => import('./pages/TimerPage'))
const RoadmapPage = lazy(() => import('./pages/RoadmapPage'))
const LogPage = lazy(() => import('./pages/LogPage'))
const SkillsPage = lazy(() => import('./pages/SkillsPage'))
const GoalsPage = lazy(() => import('./pages/GoalsPage'))
const PracticePage = lazy(() => import('./pages/PracticePage'))
const ReviewPage = lazy(() => import('./pages/ReviewPage'))
const InsightsPage = lazy(() => import('./pages/InsightsPage'))
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))

const NAV = [
  { to: '/', label: 'Dashboard', icon: '🏠' },
  { to: '/roadmap', label: 'Roadmap', icon: '🐍' },
  { to: '/timer', label: 'Timer', icon: '⏱️' },
  { to: '/log', label: 'Journal', icon: '📓' },
  { to: '/skills', label: 'Skills', icon: '🧠' },
  { to: '/goals', label: 'Goals', icon: '🎯' },
  { to: '/practice', label: 'Practice', icon: '💻' },
  { to: '/review', label: 'Review', icon: '🃏' },
  { to: '/insights', label: 'Insights', icon: '📊' },
  { to: '/leaderboard', label: 'Leaderboard', icon: '🏆' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
]

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

export default function App() {
  const s = useSettings()
  useBackgroundLoop()
  useAutoSync() // no-op unless cloud sync and auto mode are switched on

  useEffect(() => {
    document.documentElement.dataset.theme = s.theme
  }, [s.theme])

  const t = useTimer()
  const now = useNow(1000)
  useEffect(() => {
    const left = t.targetMs ? Math.max(0, t.targetMs - elapsedMs(t, now)) / 1000 : elapsedMs(t, now) / 1000
    document.title = t.running ? `${fmtDuration(left)} · Growth Tracker` : 'Growth Tracker'
  }, [t, now])

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <span>▲</span> Growth Tracker
        </div>
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => `nav ${isActive ? 'active' : ''}`}>
            <span>{n.icon}</span>
            {n.label}
          </NavLink>
        ))}
        <div className="grow" />
        <MiniTimer />
      </aside>
      <main className="main">
        <ErrorBoundary>
        <Suspense fallback={<p className="sub">Loading…</p>}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/roadmap" element={<RoadmapPage />} />
          <Route path="/timer" element={<TimerPage />} />
          <Route path="/log" element={<LogPage />} />
          <Route path="/skills" element={<SkillsPage />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/practice" element={<PracticePage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
        </Suspense>
        </ErrorBoundary>
      </main>
      <nav className="mobile-nav">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
            {n.icon}
            <br />
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
