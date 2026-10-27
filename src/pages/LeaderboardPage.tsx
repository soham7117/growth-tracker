import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, Empty, Tabs } from '../components/ui'
import { useSession } from '../lib/cloud/auth'
import { activeConnection } from '../lib/cloud/client'
import { fetchLeaderboard, friendlyError, type BoardRow } from '../lib/cloud/engine'
import { useCloudSettings } from '../lib/cloud/settings'

type Period = 'week' | 'month' | 'all'

export default function LeaderboardPage() {
  const cs = useCloudSettings()
  const session = useSession()
  const [period, setPeriod] = useState<Period>('week')
  const [rows, setRows] = useState<BoardRow[] | null>(null)
  const [me, setMe] = useState<BoardRow | null>(null)
  const [error, setError] = useState('')
  const conn = activeConnection()

  useEffect(() => {
    if (!conn) return
    let cancelled = false
    setRows(null)
    setError('')
    fetchLeaderboard(period)
      .then((r) => {
        if (cancelled) return
        setRows(r.rows)
        setMe(r.me)
      })
      .catch((e) => !cancelled && setError(friendlyError(e)))
    return () => {
      cancelled = true
    }
  }, [period, session?.user.id])

  return (
    <>
      <div className="page-h">
        <div>
          <h1>Leaderboard 🏆</h1>
          <p className="sub">For fun, not prizes: scores come from each person's own device, so treat them as friendly motivation.</p>
        </div>
        <Tabs<Period>
          tabs={[
            { id: 'week', label: 'This week' },
            { id: 'month', label: 'This month' },
            { id: 'all', label: 'All-time' },
          ]}
          value={period}
          onChange={setPeriod}
        />
      </div>

      {!conn && (
        <Card>
          <Empty>
            The leaderboard isn't available on this deployment.
          </Empty>
        </Card>
      )}

      {conn && (
        <Card>
          {error && <p className="pill bad">{error}</p>}
          {!error && rows === null && <p className="sub">Loading…</p>}
          {rows && rows.length === 0 && <Empty>No one is on this board yet. Be the first: turn on the leaderboard in Settings → Cloud sync.</Empty>}
          {rows && rows.length > 0 && (
            <div className="lb-wrap"><table className="lb">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Active days</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.rank + r.display_name} className={r.is_me ? 'me' : ''}>
                    <td>{r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : r.rank}</td>
                    <td>
                      {r.avatar} {r.display_name} {r.country && <span className="pill">{r.country}</span>}
                      {r.is_me && <span className="pill ok"> you</span>}
                    </td>
                    <td>{r.active_days}</td>
                    <td>
                      <strong>{r.score.toFixed(1)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
          {me && !rows?.some((r) => r.is_me) && (
            <p className="sub">
              Your rank: <strong>#{me.rank}</strong> · {me.score.toFixed(1)} points
            </p>
          )}
          {session === null && rows && (
            <p className="sub" style={{ fontSize: 12 }}>
              Want to be on the board? Sign in under <Link to="/settings">Settings → Cloud sync</Link> and opt in.
            </p>
          )}
          <details style={{ marginTop: 12 }}>
            <summary className="sub">How scoring works</summary>
            <p className="sub" style={{ fontSize: 13 }}>
              Per day: 10 points per roadmap topic passed, 2 per focus hour (max 8h), 3 per practice problem (max 10), 0.2 per flashcard (max 50). Plus 1 point per active day in the period (max 30). Only
              people who opted in are shown, and only daily totals are shared.
            </p>
          </details>
        </Card>
      )}
    </>
  )
}
