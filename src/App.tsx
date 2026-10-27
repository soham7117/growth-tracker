import { Suspense, useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import { useBackgroundLoop, useNow } from './lib/hooks'
import { useSettings } from './lib/settings'
import { elapsedMs, useTimer } from './lib/timer'
import { fmtDuration } from './lib/util'
import { useAutoSync } from './lib/cloud/autosync'
import ErrorBoundary from './components/ErrorBoundary'
import { MobileNav, Sidebar } from './components/Sidebar'
import NotFound from './pages/NotFound'
import { ROUTES } from './routes'

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
      <a className="skip" href="#main">
        Skip to content
      </a>
      <Sidebar />
      <main className="main" id="main" tabIndex={-1}>
        <ErrorBoundary>
          <Suspense fallback={<p className="sub" role="status">Loading…</p>}>
            <Routes>
              {ROUTES.map(({ path, element: Page }) => (
                <Route key={path} path={path} element={<Page />} />
              ))}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
      <MobileNav />
    </div>
  )
}
