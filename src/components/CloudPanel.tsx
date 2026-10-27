import { useEffect, useState } from 'react'
import { Card } from './ui'
import { confirmDialog, toast } from './Dialogs'
import { signInWithProvider, signOut, useSession } from '../lib/cloud/auth'
import { activeConnection } from '../lib/cloud/client'
import { deleteAccount, deleteCloudData, friendlyError, loadCloudInfo, loadProfile, restorePrevious, saveProfile, syncNow, type CloudInfo, type Profile } from '../lib/cloud/engine'
import { updateCloud, useCloudSettings } from '../lib/cloud/settings'
import { getPassphrase, setPassphrase, useSyncStatus } from '../lib/cloud/status'
import { timeAgo } from '../lib/util'

const AVATARS = ['🙂', '🦊', '🐼', '🦉', '🐙', '🚀', '🌱', '🔥', '🧠', '⚡']

export default function CloudPanel() {
  const cs = useCloudSettings()
  const session = useSession()
  const status = useSyncStatus()
  const [error, setError] = useState('')
  const [pass, setPass] = useState(getPassphrase())
  const [profile, setProfile] = useState<Profile>({ display_name: '', avatar: '🙂', country: null, leaderboard_opt_in: false })
  const [profileMsg, setProfileMsg] = useState('')
  const [info, setInfo] = useState<CloudInfo | null>(null)
  const conn = activeConnection()
  // Which sign-in providers the project has switched on (public endpoint); null = unknown yet.
  const [providers, setProviders] = useState<Record<string, boolean> | null>(null)

  useEffect(() => {
    if (!conn || !cs.enabled) return
    let cancelled = false
    fetch(`${conn.url.replace(/\/$/, '')}/auth/v1/settings`, { headers: { apikey: conn.key } })
      .then((r) => r.json())
      .then((d) => !cancelled && setProviders(d?.external ?? null))
      .catch(() => !cancelled && setProviders(null))
    return () => {
      cancelled = true
    }
  }, [conn?.url, conn?.key, cs.enabled])

  // details of the cloud backup (revision, device, when) shown next to the sync controls
  useEffect(() => {
    if (!session || !cs.enabled || !cs.backup) return setInfo(null)
    loadCloudInfo()
      .then(setInfo)
      .catch(() => setInfo(null))
  }, [session?.user.id, cs.enabled, cs.backup, status.at])

  const providerOff = (p: 'github' | 'google') => providers !== null && providers[p] === false

  useEffect(() => {
    if (!session || !cs.enabled) return
    loadProfile()
      .then((p) => p && setProfile(p))
      .catch((e) => setError(friendlyError(e)))
  }, [session?.user.id, cs.enabled])

  const run = (fn: () => Promise<unknown>) => async () => {
    setError('')
    try {
      await fn()
    } catch (e) {
      setError(friendlyError(e))
    }
  }

  const doSync = (force?: 'local' | 'cloud') => run(async () => void (await syncNow(force)))

  async function saveProf(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setProfileMsg('')
    try {
      await saveProfile({ ...profile, display_name: profile.display_name.trim(), country: profile.country?.trim().toUpperCase() || null })
      setProfileMsg('Profile saved.')
      if (profile.leaderboard_opt_in) await syncNow()
    } catch (err) {
      setError(friendlyError(err))
    }
  }

  return (
    <Card title="☁️ Cloud sync & leaderboard" className="span2">
      <p className="sub" style={{ marginTop: 0 }}>
        Optional. The app works fully offline; turning this on lets you back up your progress and appear on the leaderboard. Your journal is never shown to anyone. See the{' '}
        <a href="https://github.com/soham7117/growth-tracker/blob/main/docs/PRIVACY.md" target="_blank" rel="noreferrer noopener">
          privacy notes
        </a>
        .
      </p>

      <label className="chk" style={{ marginBottom: 12 }}>
        <input type="checkbox" checked={cs.enabled} onChange={(e) => updateCloud({ enabled: e.target.checked })} /> Enable cloud sync
      </label>

      {!cs.enabled && <p className="sub">Off: nothing leaves your browser and no cloud code is loaded.</p>}

      {cs.enabled && (
        <div className="form">
          {!conn && <p className="pill warn" style={{ alignSelf: 'start' }}>Cloud sync isn't available on this deployment.</p>}

          {conn && session === undefined && <p className="sub">Checking sign-in…</p>}

          {conn && session === null && (
            <div>
              <div className="lbl" style={{ marginTop: 0 }}>
                Sign in
              </div>
              <div className="row">
                <button className="btn" disabled={providerOff('github')} title={providerOff('github') ? 'Not enabled on this project yet' : undefined} onClick={run(() => signInWithProvider('github'))}>
                  Continue with GitHub
                </button>
                <button className="btn ghost" disabled={providerOff('google')} title={providerOff('google') ? 'Not enabled on this project yet' : undefined} onClick={run(() => signInWithProvider('google'))}>
                  Continue with Google{providerOff('google') ? ' (not enabled yet)' : ''}
                </button>
                <button className="btn ghost" disabled title="Needs a custom email sender; planned">
                  Email (coming later)
                </button>
              </div>
              <p className="sub" style={{ fontSize: 12 }}>
                We never see a password. Sign-in is handled by GitHub or Google.
              </p>
            </div>
          )}

          {conn && session && (
            <>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span>
                  Signed in as <strong>{session.user.email ?? session.user.user_metadata?.user_name ?? 'you'}</strong>
                </span>
                <button className="btn ghost small" onClick={run(signOut)}>
                  Sign out
                </button>
              </div>

              <form className="item form" onSubmit={saveProf}>
                <strong>Public profile &amp; leaderboard</strong>
                <div className="grid g3">
                  <label className="f">
                    Display name
                    <input type="text" maxLength={24} placeholder="not your real name" value={profile.display_name} onChange={(e) => setProfile({ ...profile, display_name: e.target.value })} />
                  </label>
                  <label className="f">
                    Avatar
                    <select value={profile.avatar} onChange={(e) => setProfile({ ...profile, avatar: e.target.value })}>
                      {AVATARS.map((a) => (
                        <option key={a}>{a}</option>
                      ))}
                    </select>
                  </label>
                  <label className="f">
                    Country (optional, 2 letters)
                    <input type="text" maxLength={2} placeholder="IN" value={profile.country ?? ''} onChange={(e) => setProfile({ ...profile, country: e.target.value })} />
                  </label>
                </div>
                <label className="chk">
                  <input type="checkbox" checked={profile.leaderboard_opt_in} onChange={(e) => setProfile({ ...profile, leaderboard_opt_in: e.target.checked })} /> Show me on the public leaderboard (shares only
                  daily totals: focus minutes, topics passed, problems, cards. Turning it off removes your daily totals from the cloud)
                </label>
                <div className="row">
                  <button className="btn" disabled={!profile.display_name.trim()}>
                    Save profile
                  </button>
                  {profileMsg && <span className="pill ok">{profileMsg}</span>}
                </div>
              </form>

              <div className="item form">
                <strong>Backup</strong>
                <label className="chk">
                  <input type="checkbox" checked={cs.backup} onChange={(e) => updateCloud({ backup: e.target.checked })} /> Back up my data to the cloud (private, only you can read it)
                </label>
                {cs.backup && (
                  <>
                    <label className="chk">
                      <input type="checkbox" checked={cs.auto} onChange={(e) => updateCloud({ auto: e.target.checked })} /> Sync automatically (otherwise use the buttons below)
                    </label>
                    <label className="chk">
                      <input type="checkbox" checked={cs.encrypt} onChange={(e) => updateCloud({ encrypt: e.target.checked })} /> Encrypt with a passphrase before uploading
                    </label>
                    {cs.encrypt && (
                      <label className="f">
                        Passphrase (kept only in this tab, never uploaded)
                        <input
                          type="password"
                          autoComplete="off"
                          value={pass}
                          onChange={(e) => {
                            setPass(e.target.value)
                            setPassphrase(e.target.value)
                          }}
                        />
                        <span className="sub" style={{ fontSize: 12 }}>
                          If you forget it, the encrypted cloud copy can't be recovered. Your local data and JSON exports are unaffected.
                        </span>
                      </label>
                    )}
                  </>
                )}
                <div className="row">
                  <button className="btn" onClick={doSync()}>
                    Sync now
                  </button>
                </div>
                {status.phase !== 'idle' && (
                  <p className={`pill ${status.phase === 'ok' ? 'ok' : status.phase === 'syncing' ? '' : status.phase === 'conflict' ? 'warn' : 'bad'}`} style={{ alignSelf: 'start' }}>
                    {status.message}
                  </p>
                )}
                {status.phase === 'conflict' && (
                  <>
                    <p className="sub" style={{ fontSize: 13, margin: 0 }}>
                      Cloud copy: {info ? `revision ${info.revision} from ${info.device ?? 'another device'}, ${timeAgo(info.updatedAt)}` : 'unknown'}. This device: {cs.lastSyncedAt ? `last synced ${timeAgo(cs.lastSyncedAt)}` : 'never synced'}. Nothing is lost
                      silently: "Keep cloud copy" first downloads a backup file of this device, and the cloud keeps a recent previous version you can restore.
                    </p>
                    <div className="row">
                      <button className="btn small" onClick={doSync('local')}>
                        Keep this device
                      </button>
                      <button className="btn ghost small" onClick={doSync('cloud')}>
                        Keep cloud copy
                      </button>
                    </div>
                  </>
                )}
                {info && (
                  <p className="sub" style={{ fontSize: 12, margin: 0 }}>
                    Cloud backup: revision {info.revision} · from {info.device ?? 'unknown device'} · {timeAgo(info.updatedAt)}
                    {info.encrypted ? ' · encrypted' : ''}
                  </p>
                )}
                {info?.previousAt && (
                  <div>
                    <button
                      className="btn ghost small"
                      onClick={async () => {
                        const ok = await confirmDialog({
                          title: 'Restore the previous cloud version?',
                          message: 'This swaps the cloud backup with its previous version and loads it onto this device. A copy of your current local data is downloaded first, and you can swap back the same way.',
                          confirmLabel: 'Restore',
                        })
                        if (ok) await run(async () => void (await restorePrevious()))()
                      }}
                    >
                      ↩ Restore previous cloud version (saved {timeAgo(info.previousAt)})
                    </button>
                  </div>
                )}
                <p className="sub" style={{ fontSize: 12, margin: 0 }}>
                  Last synced: {cs.lastSyncedAt ? new Date(cs.lastSyncedAt).toLocaleString() : 'never'}
                </p>
              </div>

              <div className="row">
                <button
                  className="btn danger small"
                  onClick={run(async () => {
                    const ok = await confirmDialog({
                      title: 'Delete your cloud data?',
                      message: 'This removes your cloud backup and leaderboard history. Data on this device stays.',
                      confirmLabel: 'Delete cloud data',
                      tone: 'danger',
                    })
                    if (ok) {
                      await deleteCloudData()
                      toast('Cloud data deleted.', 'success')
                    }
                  })}
                >
                  Delete my cloud data
                </button>
                <button
                  className="btn danger small"
                  onClick={run(async () => {
                    const ok = await confirmDialog({
                      title: 'Delete your account?',
                      message: 'This permanently deletes your account and everything stored in the cloud. It cannot be undone. Data on this device stays.',
                      confirmLabel: 'Delete account',
                      tone: 'danger',
                    })
                    if (ok) {
                      await deleteAccount()
                      toast('Account deleted.', 'success')
                    }
                  })}
                >
                  Delete my account
                </button>
              </div>
            </>
          )}

          {error && <p className="pill bad" style={{ alignSelf: 'start' }}>{error}</p>}
        </div>
      )}
    </Card>
  )
}
