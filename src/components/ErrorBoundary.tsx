import { Component, type ErrorInfo, type ReactNode } from 'react'
import { download, today } from '../lib/util'
import { exportAll } from '../db'

interface State {
  error: Error | null
}

const RELOAD_FLAG = 'gt-chunk-reload'

/** After a deploy, an already-open tab asks for page files that no longer exist. */
export const isChunkError = (e: Error) => /dynamically imported module|importing a module script failed|error loading dynamically/i.test(e.message)

/** Reload once to pick up the new deploy; the flag stops a reload loop if the network is really down. */
function reloadOnceForNewDeploy() {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_FLAG) || 0)
    if (Date.now() - last < 60_000) return false
    sessionStorage.setItem(RELOAD_FLAG, String(Date.now()))
  } catch {
    return false
  }
  location.reload()
  return true
}

/** Catches render errors so one broken page doesn't blank the whole app, and lets the user save their data. */
export default class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('UI error:', error, info.componentStack)
    if (isChunkError(error)) reloadOnceForNewDeploy()
  }

  // navigating to another page gives it a fresh chance instead of staying stuck on the error card
  componentDidUpdate(prev: { resetKey?: string }) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null })
  }

  async backup() {
    try {
      download(`growth-tracker-backup-${today()}.json`, JSON.stringify(await exportAll(), null, 2))
    } catch {
      alert('Could not export data.')
    }
  }

  render() {
    if (!this.state.error) return this.props.children
    if (isChunkError(this.state.error)) {
      return (
        <div className="card" style={{ maxWidth: 560, margin: '60px auto' }}>
          <h2>A new version is available</h2>
          <p className="sub">This page was opened before the latest update. Reload to continue; your data is untouched.</p>
          <button className="btn" onClick={() => location.reload()}>
            Reload app
          </button>
        </div>
      )
    }
    return (
      <div className="card" style={{ maxWidth: 560, margin: '60px auto' }}>
        <h2>Something went wrong 😕</h2>
        <p className="sub">This page crashed, but your data is safe in your browser. You can download a backup before reloading.</p>
        <pre className="qcode">{this.state.error.message}</pre>
        <div className="row">
          <button className="btn" onClick={() => location.reload()}>
            Reload app
          </button>
          <button className="btn ghost" onClick={() => this.backup()}>
            ⬇ Download backup
          </button>
          <button className="btn ghost" onClick={() => this.setState({ error: null })}>
            Try again
          </button>
        </div>
      </div>
    )
  }
}
