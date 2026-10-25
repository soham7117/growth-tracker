import { clearAll, db, type Session } from '../db'
import { PYTHON_ROADMAP } from '../data/pythonRoadmap'
import { addDays, quarterOf, today } from './util'

// Small deterministic PRNG so the sample data is the same every time.
function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Replaces ALL data with realistic sample data so people can try the app. */
export async function loadDemoData() {
  await clearAll()
  const rand = rng(42)
  const t = today()
  const now = Date.now()

  // Skills (top-level + a few children)
  const top: Record<string, number> = {}
  const defs: [string, number][] = [
    ['Python', 4],
    ['Data Structures', 3],
    ['Algorithms', 3],
    ['System Design', 2],
    ['React', 3],
    ['Databases / SQL', 2],
    ['Git & Tooling', 4],
    ['Testing', 2],
  ]
  for (const [name, level] of defs) {
    top[name] = (await db.skills.add({ name, parentId: null, level, lastPracticed: addDays(t, -Math.floor(rand() * 9)), createdAt: now })) as number
  }
  const kids: [string, string, number][] = [
    ['Dynamic Programming', 'Algorithms', 2],
    ['Graphs', 'Algorithms', 1],
    ['Caching', 'System Design', 2],
    ['Decorators & Generators', 'Python', 3],
  ]
  for (const [name, parent, level] of kids) {
    await db.skills.add({ name, parentId: top[parent], level, lastPracticed: addDays(t, -Math.floor(rand() * 20)), createdAt: now })
  }
  const skillIds = Object.values(top)

  // ~5 months of focus sessions with a realistic rhythm (busier on weekdays, a few gaps)
  const sessions: Omit<Session, 'id'>[] = []
  for (let d = 150; d >= 0; d--) {
    const date = addDays(t, -d)
    const dow = new Date(date + 'T12:00:00').getDay()
    const weekend = dow === 0 || dow === 6
    if (rand() > (weekend ? 0.45 : 0.85)) continue
    const count = 1 + Math.floor(rand() * (weekend ? 2 : 3))
    for (let i = 0; i < count; i++) {
      const hour = rand() < 0.6 ? 19 + Math.floor(rand() * 3) : 8 + Math.floor(rand() * 4)
      const start = new Date(date + 'T00:00:00').getTime() + (hour * 60 + Math.floor(rand() * 40)) * 60000
      if (start > now) continue
      sessions.push({
        start,
        minutes: [25, 25, 25, 45, 50, 90][Math.floor(rand() * 6)],
        kind: rand() < 0.7 ? 'pomodoro' : 'stopwatch',
        skillId: skillIds[Math.floor(rand() * skillIds.length)],
        date,
      })
    }
  }
  await db.sessions.bulkAdd(sessions as Session[])

  // Journal
  const logs: [number, string, string, string, number, number, string[]][] = [
    [0, 'Learned how Python decorators wrap functions, and wrote a timing decorator.\n```python\ndef timed(f):\n    def w(*a, **k):\n        import time; s = time.time()\n        r = f(*a, **k)\n        print(f.__name__, time.time() - s)\n        return r\n    return w\n```', 'Forgot functools.wraps, so the function name was lost.', 'Understood closures finally.', 4, 4, ['python', 'decorators']],
    [1, 'Solved 3 hash map problems. Pattern: store value to index, check complement.', '', 'Two Sum in under 10 minutes.', 4, 3, ['algorithms', 'hashmaps']],
    [2, 'Read about database indexes and when a composite index helps.', 'Query plan output is still confusing.', '', 3, 3, ['sql']],
    [4, 'Built a small React form with controlled inputs.', 'Stale state in an effect, fixed with a dependency array.', 'Shipped the form.', 5, 4, ['react']],
    [6, 'Reviewed binary trees: in-order, pre-order, post-order.', 'Low energy, short session.', '', 2, 2, ['dsa']],
    [9, 'Wrote my first pytest fixtures and parametrized tests.', '', 'Test suite runs in 0.4s.', 4, 4, ['testing', 'python']],
  ]
  await db.logs.bulkAdd(
    logs.map(([ago, learned, blockers, wins, mood, energy, tags]) => ({
      date: addDays(t, -ago),
      learned,
      blockers,
      wins,
      mood,
      energy,
      tags,
      createdAt: now - ago * 86400000,
    }))
  )

  // Goals + milestones
  const g1 = (await db.goals.add({ title: 'Solve 100 DSA problems', quarter: quarterOf(), done: false, createdAt: now })) as number
  const g2 = (await db.goals.add({ title: 'Finish the Python roadmap', quarter: quarterOf(), done: false, createdAt: now - 1000 })) as number
  const g3 = (await db.goals.add({ title: 'Ship a side project', quarter: quarterOf(), done: false, createdAt: now - 2000 })) as number
  await db.milestones.bulkAdd([
    { goalId: g1, title: '25 problems', week: 'W3', done: true },
    { goalId: g1, title: '50 problems', week: 'W6', done: true },
    { goalId: g1, title: '75 problems', week: 'W9', done: false },
    { goalId: g1, title: '100 problems', week: 'W12', done: false },
    { goalId: g2, title: 'Basics + data structures', week: 'W2', done: true },
    { goalId: g2, title: 'OOP and modules', week: 'W5', done: true },
    { goalId: g2, title: 'Frameworks and testing', week: 'W10', done: false },
    { goalId: g3, title: 'Design the data model', week: 'W2', done: true },
    { goalId: g3, title: 'Build the MVP', week: 'W6', done: false },
    { goalId: g3, title: 'Deploy and share', week: 'W8', done: false },
  ])

  // Practice log
  await db.problems.bulkAdd([
    { title: 'Two Sum', platform: 'LeetCode', difficulty: 'Easy', minutes: 12, hints: 0, solved: true, skillId: top['Algorithms'], retryDate: '', date: addDays(t, -1), notes: 'Hash map of value to index.' },
    { title: 'Valid Parentheses', platform: 'LeetCode', difficulty: 'Easy', minutes: 15, hints: 0, solved: true, skillId: top['Data Structures'], retryDate: '', date: addDays(t, -2), notes: 'Stack.' },
    { title: 'Merge Intervals', platform: 'LeetCode', difficulty: 'Medium', minutes: 40, hints: 1, solved: true, skillId: top['Algorithms'], retryDate: addDays(t, -1), date: addDays(t, -8), notes: 'Sort by start, then merge.' },
    { title: 'Longest Substring Without Repeating Characters', platform: 'LeetCode', difficulty: 'Medium', minutes: 45, hints: 2, solved: false, skillId: top['Algorithms'], retryDate: addDays(t, 2), date: addDays(t, -5), notes: 'Sliding window.' },
  ])
  await db.projects.bulkAdd([
    { title: 'Growth Tracker', url: 'https://github.com/soham7117/growth-tracker', type: 'project', reflection: 'Would add cloud sync and more quiz questions.', date: addDays(t, -3) },
    { title: 'Fix off-by-one in pagination', url: '', type: 'pr', reflection: 'Should have added a regression test first.', date: addDays(t, -12) },
  ])
  await db.resources.bulkAdd([
    { title: 'Fluent Python', kind: 'book', takeaway: 'Special methods make your objects feel built-in.', date: addDays(t, -6) },
    { title: 'Python generators explained', kind: 'video', takeaway: 'yield pauses a function and keeps its state.', date: addDays(t, -10) },
  ])

  // Flashcards (a few due today)
  const cards: [string, string, number, number][] = [
    ['What is the GIL?', 'A lock allowing only one thread to run Python bytecode at a time in CPython.', 0, 0],
    ['Time complexity of dict lookup?', 'O(1) on average.', 0, 0],
    ['Difference between a list and a tuple?', 'Lists are mutable, tuples are immutable.', 0, 0],
    ['What does @staticmethod do?', 'Defines a method that gets no implicit self or cls argument.', 3, 6],
    ['What is a closure?', 'A function that remembers variables from its enclosing scope.', 5, 6],
  ]
  await db.flashcards.bulkAdd(
    cards.map(([front, back, dueIn, interval]) => ({ front, back, skillId: top['Python'], ease: 2.5, interval, reps: interval ? 2 : 0, due: addDays(t, dueIn) }))
  )

  // Roadmap: first few sections mostly done
  const done = PYTHON_ROADMAP.flatMap((s, si) => s.items.filter((_, ii) => (si === 0 && ii < 12) || (si === 1 && ii < 4) || (si === 2) || (si === 3 && ii < 4)).map((i) => i.id))
  await db.roadmap.bulkAdd(done.map((id, k) => ({ id, done: true, doneAt: now - (done.length - k) * 3600000 })))
}
