import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { bumpCardsReviewed, db } from '../db'
import { Card, DictateButton, Empty, SkillSelect } from '../components/ui'
import { useSkills } from '../lib/hooks'
import { sm2, today } from '../lib/util'

export default function ReviewPage() {
  const skills = useSkills()
  const cards = useLiveQuery(() => db.flashcards.toArray(), [], [])
  const dueCards = cards.filter((c) => c.due <= today()).sort((a, b) => a.due.localeCompare(b.due))
  const dueProblems = useLiveQuery(() => db.problems.where('retryDate').between('0000', today() + '￿').toArray(), [], [])
  const retry = dueProblems.filter((p) => p.retryDate && p.retryDate <= today())
  const [reveal, setReveal] = useState(false)
  const [f, setF] = useState({ front: '', back: '', skillId: null as number | null })
  const [showAll, setShowAll] = useState(false)

  const card = dueCards[0]

  async function grade(q: number) {
    if (!card) return
    await db.flashcards.update(card.id!, sm2(card, q))
    await bumpCardsReviewed(today())
    setReveal(false)
  }

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!f.front.trim() || !f.back.trim()) return
    await db.flashcards.add({ ...f, front: f.front.trim(), back: f.back.trim(), ease: 2.5, interval: 0, reps: 0, due: today() })
    setF({ ...f, front: '', back: '' })
  }

  return (
    <>
      <div className="page-h">
        <div>
          <h1>Review</h1>
          <p className="sub">Spaced repetition (SM-2). Cards you rate poorly come back sooner; easy ones fade out.</p>
        </div>
      </div>

      <div className="grid g2" style={{ alignItems: 'start' }}>
        <div className="grid">
          <Card title={`Due now (${dueCards.length})`}>
            {!card ? (
              <Empty>🎉 Nothing due. {cards.length === 0 ? 'Add your first flashcard →' : 'Come back tomorrow.'}</Empty>
            ) : (
              <>
                <div className="fc">{card.front}</div>
                {reveal && <div className="fc back">{card.back}</div>}
                <div className="row" style={{ justifyContent: 'center', marginTop: 12 }}>
                  {!reveal ? (
                    <button className="btn" onClick={() => setReveal(true)}>
                      Show answer
                    </button>
                  ) : (
                    <>
                      <button className="btn danger" onClick={() => grade(1)}>
                        Again
                      </button>
                      <button className="btn ghost" onClick={() => grade(3)}>
                        Hard
                      </button>
                      <button className="btn good" onClick={() => grade(4)}>
                        Good
                      </button>
                      <button className="btn" onClick={() => grade(5)}>
                        Easy
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </Card>

          <Card title={`Problems to retry (${retry.length})`}>
            {retry.length === 0 ? (
              <Empty>No problems due for a retry.</Empty>
            ) : (
              <div className="list">
                {retry.map((p) => (
                  <div key={p.id} className="item top">
                    <div>
                      <strong>{p.title}</strong>
                      <div className="meta">
                        <span>{p.platform}</span>
                        <span>due {p.retryDate}</span>
                      </div>
                    </div>
                    <button className="btn small good" onClick={() => db.problems.update(p.id!, { retryDate: '' })}>
                      Done
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="grid">
          <Card title="Add flashcard">
            <form className="form" onSubmit={add}>
              <label className="f">
                <span className="row">
                  Front (question)
                  <DictateButton onText={(t) => setF((x) => ({ ...x, front: (x.front ? x.front + ' ' : '') + t }))} />
                </span>
                <textarea value={f.front} onChange={(e) => setF({ ...f, front: e.target.value })} />
              </label>
              <label className="f">
                <span className="row">
                  Back (answer)
                  <DictateButton onText={(t) => setF((x) => ({ ...x, back: (x.back ? x.back + ' ' : '') + t }))} />
                </span>
                <textarea value={f.back} onChange={(e) => setF({ ...f, back: e.target.value })} />
              </label>
              <SkillSelect skills={skills} value={f.skillId} onChange={(v) => setF({ ...f, skillId: v })} />
              <button className="btn">Add card</button>
            </form>
          </Card>

          <Card
            title={`All cards (${cards.length})`}
            right={
              cards.length > 0 && (
                <button className="btn ghost small" onClick={() => setShowAll(!showAll)}>
                  {showAll ? 'Hide' : 'Show'}
                </button>
              )
            }
          >
            {showAll && (
              <div className="list">
                {cards.map((c) => (
                  <div key={c.id} className="item top">
                    <div>
                      <strong>{c.front}</strong>
                      <div className="meta">
                        <span>next: {c.due}</span>
                        <span>interval {c.interval}d</span>
                      </div>
                    </div>
                    <button className="x" onClick={() => db.flashcards.delete(c.id!)}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}
