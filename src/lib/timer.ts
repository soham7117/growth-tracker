import { useSyncExternalStore } from 'react'
import { db, touchSkill } from '../db'
import { alarm, unlockAudio } from './alarm'
import { getSettings } from './settings'
import { today } from './util'

export type Mode = 'pomodoro' | 'stopwatch' | 'countdown'
export type Phase = 'focus' | 'short' | 'long'

export interface TimerState {
  mode: Mode
  phase: Phase
  running: boolean
  startedAt: number | null // epoch ms of the current run segment
  accMs: number // time banked from earlier segments
  targetMs: number // 0 = no target (stopwatch)
  skillId: number | null
  cycles: number // completed pomodoros
  sessionStart: number | null
  countdownMin: number
}

const KEY = 'gt-timer'

function fresh(mode: Mode = 'pomodoro', skillId: number | null = null, countdownMin = 45): TimerState {
  const s = getSettings()
  return {
    mode,
    phase: 'focus',
    running: false,
    startedAt: null,
    accMs: 0,
    targetMs: mode === 'pomodoro' ? s.focusMin * 60000 : mode === 'countdown' ? countdownMin * 60000 : 0,
    skillId,
    cycles: 0,
    sessionStart: null,
    countdownMin,
  }
}

function load(): TimerState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...fresh(), ...JSON.parse(raw) }
  } catch {
    /* ignore */
  }
  return fresh()
}

let state: TimerState = load()
const listeners = new Set<() => void>()

function set(patch: Partial<TimerState>) {
  state = { ...state, ...patch }
  localStorage.setItem(KEY, JSON.stringify(state))
  listeners.forEach((l) => l())
}

export const getTimer = () => state

export function elapsedMs(s: TimerState = state, now = Date.now()) {
  return s.accMs + (s.running && s.startedAt ? now - s.startedAt : 0)
}

async function saveSession(ms: number, kind: Mode, skillId: number | null, start: number | null) {
  const minutes = Math.round((ms / 60000) * 10) / 10
  if (minutes < 0.2) return
  const date = today()
  await db.sessions.add({ start: start ?? Date.now() - ms, minutes, kind, skillId, date })
  await touchSkill(skillId, date)
}

export const timer = {
  setMode(mode: Mode) {
    if (state.running) return
    set({ ...fresh(mode, state.skillId, state.countdownMin) })
  },
  setSkill(skillId: number | null) {
    set({ skillId })
  },
  setCountdownMin(m: number) {
    const min = Math.max(1, Math.min(600, m || 1))
    set({ countdownMin: min, ...(state.mode === 'countdown' && !state.running && state.accMs === 0 ? { targetMs: min * 60000 } : {}) })
  },
  start() {
    unlockAudio()
    if (state.running) return
    set({ running: true, startedAt: Date.now(), sessionStart: state.sessionStart ?? Date.now() })
  },
  pause() {
    if (!state.running) return
    set({ running: false, accMs: elapsedMs(), startedAt: null })
  },
  /** Stop a focus run early and keep the time worked as a session. */
  async finish() {
    const ms = elapsedMs()
    if (state.phase === 'focus') await saveSession(ms, state.mode, state.skillId, state.sessionStart)
    set({ ...fresh(state.mode, state.skillId, state.countdownMin), cycles: state.cycles })
  },
  reset() {
    set({ ...fresh(state.mode, state.skillId, state.countdownMin), cycles: state.cycles })
  },
  skipBreak() {
    if (state.phase === 'focus') return
    const s = getSettings()
    set({ phase: 'focus', running: false, startedAt: null, accMs: 0, targetMs: s.focusMin * 60000, sessionStart: null })
  },
  tick() {
    if (!state.running || !state.targetMs) return
    if (elapsedMs() >= state.targetMs) void complete()
  },
}

async function complete() {
  const s = getSettings()
  const prev = state
  if (prev.phase === 'focus') {
    await saveSession(prev.targetMs, prev.mode, prev.skillId, prev.sessionStart)
    if (prev.mode === 'pomodoro') {
      const cycles = prev.cycles + 1
      const long = cycles % 4 === 0
      alarm('Focus session done 🎉', long ? 'Take a long break — you earned it.' : 'Time for a short break.')
      set({
        phase: long ? 'long' : 'short',
        cycles,
        accMs: 0,
        sessionStart: null,
        targetMs: (long ? s.longBreakMin : s.shortBreakMin) * 60000,
        running: s.autoStartBreaks,
        startedAt: s.autoStartBreaks ? Date.now() : null,
      })
    } else {
      alarm('Timer finished ⏰', 'Your countdown has ended and the session was logged.')
      set({ ...fresh('countdown', prev.skillId, prev.countdownMin), cycles: prev.cycles })
    }
  } else {
    alarm('Break over', 'Ready for the next focus session?')
    set({ phase: 'focus', running: false, startedAt: null, accMs: 0, targetMs: s.focusMin * 60000, sessionStart: null })
  }
}

export function useTimer() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => state
  )
}
