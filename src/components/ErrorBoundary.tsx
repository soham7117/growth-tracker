import { Component, type ErrorInfo, type ReactNode } from 'react'
import { download, today } from '../lib/util'
import { exportAll } from '../db'

interface State {
  error: Error | null
}

/** Catches render errors so one broken page doesn't blank the whole app, and lets the user save their data. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('UI error:', error, info.componentStack)
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
