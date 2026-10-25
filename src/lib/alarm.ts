import { getSettings } from './settings'

let ctx: AudioContext | null = null

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

/** Call from a user gesture so later alarms are allowed to play. */
export function unlockAudio() {
  audio()
}

export function beep(times = 3) {
  const c = audio()
  if (!c) return
  const notes = [880, 1100, 880]
  for (let i = 0; i < times; i++) {
    const t = c.currentTime + i * 0.45
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'sine'
    osc.frequency.value = notes[i % notes.length]
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35)
    osc.connect(gain).connect(c.destination)
    osc.start(t)
    osc.stop(t + 0.4)
  }
}

export async function requestNotifications() {
  if (!('Notification' in window)) return 'unsupported' as const
  if (Notification.permission === 'default') return await Notification.requestPermission()
  return Notification.permission
}

export async function notify(title: string, body: string) {
  const s = getSettings()
  if (!s.notifications || !('Notification' in window) || Notification.permission !== 'granted') return
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) await reg.showNotification(title, { body, icon: './icon.svg' })
    else new Notification(title, { body, icon: './icon.svg' })
  } catch {
    /* ignore */
  }
}

/** Sound + notification together, respecting settings. */
export function alarm(title: string, body: string) {
  if (getSettings().sound) beep()
  notify(title, body)
}
