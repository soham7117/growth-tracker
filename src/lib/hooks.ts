import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { notify } from './alarm'
import { getSettings } from './settings'
import { timer } from './timer'
import { today } from './util'

/** Re-render every `ms` (used for live clocks). */
export function useNow(ms = 500) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(id)
  }, [ms])
  return now
}

export function useSkills() {
  return useLiveQuery(() => db.skills.toArray(), [], [])
}

/**
 * App-level background loop: ticks the timer and fires daily / weekly reminders
 * while the app is open (or installed as a PWA).
 */
export function useBackgroundLoop() {
  useEffect(() => {
    const id = setInterval(() => {
      timer.tick()
      const s = getSettings()
      const d = new Date()
      const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      const fired = (key: string) => {
        const k = `gt-fired-${key}-${today()}`
        if (localStorage.getItem(k)) return true
        localStorage.setItem(k, '1')
        return false
      }
      if (s.dailyReminder && hm === s.dailyReminder && !fired('daily')) {
        notify('Time to grow 🌱', 'Start your daily focus block and log what you learn.')
      }
      if (s.weeklyReminderDay >= 0 && d.getDay() === s.weeklyReminderDay && hm === s.weeklyReminderTime && !fired('weekly')) {
        notify('Weekly review 📊', 'Open Insights and review your week.')
      }
    }, 1000)
    return () => clearInterval(id)
  }, [])
}
