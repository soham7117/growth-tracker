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

class TrackerDB extends Dexie {
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
] as const

export async function exportAll() {
  const out: Record<string, unknown[]> = {}
  for (const t of TABLES) out[t] = await (db as any)[t].toArray()
  return { app: 'growth-tracker', version: 1, exportedAt: new Date().toISOString(), data: out }
}

export async function importAll(json: any) {
  if (!json || json.app !== 'growth-tracker' || !json.data) throw new Error('Not a Growth Tracker backup file')
  await db.transaction('rw', TABLES.map((t) => (db as any)[t]), async () => {
    for (const t of TABLES) {
      await (db as any)[t].clear()
      if (Array.isArray(json.data[t])) await (db as any)[t].bulkAdd(json.data[t])
    }
  })
}

export async function clearAll() {
  await db.transaction('rw', TABLES.map((t) => (db as any)[t]), async () => {
    for (const t of TABLES) await (db as any)[t].clear()
  })
}

export async function touchSkill(skillId: number | null | undefined, date: string) {
  if (!skillId) return
  const s = await db.skills.get(skillId)
  if (s && (!s.lastPracticed || s.lastPracticed < date)) await db.skills.update(skillId, { lastPracticed: date })
}
