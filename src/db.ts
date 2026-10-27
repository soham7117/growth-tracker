import Dexie, { type Table } from 'dexie'

export interface Skill {
  id?: number
  name: string
  parentId: number | null
  level: number // 0-5
  lastPracticed?: string
  createdAt: number
}
export interface Session {
  id?: number
  start: number
  minutes: number
  kind: 'pomodoro' | 'stopwatch' | 'countdown'
  skillId: number | null
  note?: string
  date: string
}
export interface LogEntry {
  id?: number
  date: string
  learned: string
  blockers: string
  wins: string
  mood: number
  energy: number
  tags: string[]
  createdAt: number
}
export interface Goal {
  id?: number
  title: string
  quarter: string
  done: boolean
  createdAt: number
}
export interface Milestone {
  id?: number
  goalId: number
  title: string
  week: string
  done: boolean
}
export interface Problem {
  id?: number
  title: string
  platform: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  minutes: number
  hints: number
  solved: boolean
  skillId: number | null
  retryDate: string
  date: string
  notes: string
}
export interface Project {
  id?: number
  title: string
  url: string
  type: 'project' | 'pr'
  reflection: string
  date: string
}
export interface Resource {
  id?: number
  title: string
  kind: 'book' | 'video' | 'article' | 'course'
  takeaway: string
  date: string
}
export interface Flashcard {
  id?: number
  front: string
  back: string
  skillId: number | null
  ease: number
  interval: number
  reps: number
  due: string
}

export interface RoadmapProgress {
  id: string
  done: boolean
  doneAt: number
}

/** Small per-day counters that can't be derived from other tables (used for the leaderboard). */
export interface Activity {
  date: string
  cardsReviewed: number
}

class TrackerDB extends Dexie {
  activity!: Table<Activity, string>
  roadmap!: Table<RoadmapProgress, string>
  skills!: Table<Skill, number>
  sessions!: Table<Session, number>
  logs!: Table<LogEntry, number>
  goals!: Table<Goal, number>
  milestones!: Table<Milestone, number>
  problems!: Table<Problem, number>
  projects!: Table<Project, number>
  resources!: Table<Resource, number>
  flashcards!: Table<Flashcard, number>

  constructor() {
    super('growth-tracker')
    this.version(1).stores({
      skills: '++id, parentId, name',
      sessions: '++id, date, skillId, start',
      logs: '++id, date, createdAt',
      goals: '++id, quarter, done',
      milestones: '++id, goalId, done',
      problems: '++id, date, skillId, retryDate',
      projects: '++id, date',
      resources: '++id, date',
      flashcards: '++id, due, skillId',
    })
    this.version(2).stores({ roadmap: 'id' })
    this.version(3).stores({ activity: 'date' })
  }
}

export const db = new TrackerDB()

export const TABLES = [
  'skills',
  'sessions',
  'logs',
  'goals',
  'milestones',
  'problems',
  'projects',
  'resources',
  'flashcards',
  'roadmap',
  'activity',
] as const

export type TableName = (typeof TABLES)[number]

const tableOf = (name: TableName) => db.table(name)

export async function exportAll() {
  const data: Record<string, unknown[]> = {}
  for (const t of TABLES) data[t] = await tableOf(t).toArray()
  return { app: 'growth-tracker', version: 1, exportedAt: new Date().toISOString(), data }
}

const isRow = (r: unknown): r is Record<string, unknown> => typeof r === 'object' && r !== null && !Array.isArray(r)

/**
 * Replaces all local data with a backup. The file is untrusted input (hand-edited, from another
 * device, or downloaded), so it is validated completely before anything is deleted.
 */
export async function importAll(json: unknown) {
  const file = json as { app?: unknown; data?: Record<string, unknown> } | null
  if (!file || file.app !== 'growth-tracker' || !isRow(file.data)) throw new Error('Not a Growth Tracker backup file')
  const data = file.data
  for (const t of TABLES) {
    const rows = data[t]
    if (rows === undefined) continue
    if (!Array.isArray(rows) || !rows.every(isRow)) throw new Error(`Backup is damaged: "${t}" is not a list of records`)
  }
  await db.transaction('rw', TABLES.map(tableOf), async () => {
    for (const t of TABLES) {
      await tableOf(t).clear()
      const rows = data[t]
      if (Array.isArray(rows)) await tableOf(t).bulkAdd(rows)
    }
  })
}

export async function clearAll() {
  await db.transaction('rw', TABLES.map(tableOf), async () => {
    for (const t of TABLES) await tableOf(t).clear()
  })
}

export async function bumpCardsReviewed(date: string) {
  await db.transaction('rw', db.activity, async () => {
    const cur = await db.activity.get(date)
    await db.activity.put({ date, cardsReviewed: (cur?.cardsReviewed ?? 0) + 1 })
  })
}

export async function touchSkill(skillId: number | null | undefined, date: string) {
  if (!skillId) return
  const s = await db.skills.get(skillId)
  if (s && (!s.lastPracticed || s.lastPracticed < date)) await db.skills.update(skillId, { lastPracticed: date })
}
