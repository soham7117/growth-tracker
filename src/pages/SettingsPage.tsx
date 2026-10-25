import { useRef, useState } from 'react'
import { clearAll, exportAll, importAll } from '../db'
import { Card } from '../components/ui'
import { beep, notify, requestNotifications, unlockAudio } from '../lib/alarm'
import { loadDemoData } from '../lib/demo'
import { DEFAULTS, updateSettings, useSettings } from '../lib/settings'
import { timer } from '../lib/timer'
import { download, today } from '../lib/util'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function SettingsPage() {
  const s = useSettings()
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')
  const [perm, setPerm] = useState('Notification' in window ? Notification.permission : 'unsupported')

  const num = (k: 'focusMin' | 'shortBreakMin' | 'longBreakMin' | 'dailyGoalMin') => (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSettings({ [k]: Math.max(1, Number(e.target.value) || 1) })
    if (k !== 'dailyGoalMin') timer.reset()
  }

  async function doExport() {
    download(`growth-tracker-backup-${today()}.json`, JSON.stringify(await exportAll(), null, 2))
    localStorage.setItem('gt-last-backup', today())
    setMsg('Backup downloaded.')
  }

  async function doImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!confirm('Importing replaces ALL current data. Continue?')) return
    try {
      await importAll(JSON.parse(await file.text()))
      setMsg('Import complete.')
    } catch (err: any) {
      setMsg(`Import failed: ${err.message}`)
    }
    e.target.value = ''
  }

  async function enableNotifs() {
    setPerm(await requestNotifications())
  }

  return (
    <>
      <div className="page-h">
        <div>
          <h1>Settings</h1>
          <p className="sub">Everything is stored locally in your browser. Nothing leaves your device.</p>
        </div>
      </div>

      <div className="grid g2" style={{ alignItems: 'start' }}>
        <Card title="Timer">
          <div className="form">
            <div className="grid g3">
              <label className="f">
                Focus (min)
                <input type="number" min={1} value={s.focusMin} onChange={num('focusMin')} />
              </label>
              <label className="f">
                Short break
                <input type="number" min={1} value={s.shortBreakMin} onChange={num('shortBreakMin')} />
              </label>
              <label className="f">
                Long break
                <input type="number" min={1} value={s.longBreakMin} onChange={num('longBreakMin')} />
              </label>
            </div>
            <label className="f">
              Daily focus goal (min)
              <input type="number" min={1} value={s.dailyGoalMin} onChange={num('dailyGoalMin')} />
            </label>
            <label className="chk">
              <input type="checkbox" checked={s.autoStartBreaks} onChange={(e) => updateSettings({ autoStartBreaks: e.target.checked })} /> Auto-start breaks
            </label>
          </div>
        </Card>

        <Card title="Alarms & reminders">
          <div className="form">
            <label className="chk">
              <input type="checkbox" checked={s.sound} onChange={(e) => updateSettings({ sound: e.target.checked })} /> Play alarm sound
            </label>
            <label className="chk">
              <input type="checkbox" checked={s.notifications} onChange={(e) => updateSettings({ notifications: e.target.checked })} /> Show desktop notifications
            </label>
            <div className="row">
              <button
                className="btn ghost small"
                onClick={() => {
                  unlockAudio()
                  beep()
                }}
              >
                🔊 Test sound
              </button>
              <button className="btn ghost small" onClick={enableNotifs}>
                🔔 Enable notifications ({perm})
              </button>
              <button className="btn ghost small" onClick={() => notify('Test notification', 'It works!')}>
                Test notification
              </button>
            </div>
            <label className="f">
              Daily reminder time (leave empty to disable)
              <input type="time" value={s.dailyReminder} onChange={(e) => updateSettings({ dailyReminder: e.target.value })} />
            </label>
            <div className="grid g2">
              <label className="f">
                Weekly review day
                <select value={s.weeklyReminderDay} onChange={(e) => updateSettings({ weeklyReminderDay: Number(e.target.value) })}>
                  <option value={-1}>Off</option>
                  {DAYS.map((d, i) => (
                    <option key={d} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
              <label className="f">
                Weekly review time
                <input type="time" value={s.weeklyReminderTime} onChange={(e) => updateSettings({ weeklyReminderTime: e.target.value })} />
              </label>
            </div>
            <p className="sub" style={{ fontSize: 12 }}>
              Reminders fire while the app is open in a tab or installed as an app (browsers can't wake a closed page without a server).
            </p>
          </div>
        </Card>

        <Card title="Appearance">
          <div className="row">
            <button className={`btn ${s.theme === 'dark' ? '' : 'ghost'}`} onClick={() => updateSettings({ theme: 'dark' })}>
              🌙 Dark
            </button>
            <button className={`btn ${s.theme === 'light' ? '' : 'ghost'}`} onClick={() => updateSettings({ theme: 'light' })}>
              ☀️ Light
            </button>
            <button className="btn ghost" onClick={() => updateSettings(DEFAULTS)}>
              Reset settings
            </button>
          </div>
        </Card>

        <Card title="Your data">
          <div className="form">
            <p className="sub" style={{ margin: 0 }}>
              Last backup: {localStorage.getItem('gt-last-backup') || 'never'}. Download a backup regularly — browser data can be cleared.
            </p>
            <div className="row">
              <button className="btn" onClick={doExport}>
                ⬇ Export backup (JSON)
              </button>
              <button className="btn ghost" onClick={() => fileRef.current?.click()}>
                ⬆ Import backup
              </button>
              <input ref={fileRef} type="file" accept="application/json" hidden onChange={doImport} />
            </div>
            <button
              className="btn ghost"
              onClick={async () => {
                if (confirm('Replace ALL current data with sample data? Export a backup first if you want to keep your data.')) {
                  await loadDemoData()
                  setMsg('Sample data loaded.')
                }
              }}
            >
              ✨ Load sample data
            </button>
            <button
              className="btn danger"
              onClick={async () => {
                if (confirm('Delete ALL data permanently? Export a backup first!')) {
                  await clearAll()
                  setMsg('All data cleared.')
                }
              }}
            >
              Delete all data
            </button>
            {msg && <p className="pill ok" style={{ alignSelf: 'start' }}>{msg}</p>}
          </div>
        </Card>
      </div>
    </>
  )
}
