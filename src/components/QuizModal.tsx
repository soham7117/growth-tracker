import { useEffect, useMemo, useState } from 'react'
import { QUIZZES } from '../data/quizzes'
import { PRACTICE, SEARCH_TERMS, gfgSearch, leetcodeSearch, openPopup } from '../data/practice'

type Stage = 'quiz' | 'result' | 'practice'

function shuffle<T>(arr: T[]) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function QuizModal({
  itemId,
  label,
  startAt = 'quiz',
  onPass,
  onClose,
}: {
  itemId: string
  label: string
  startAt?: 'quiz' | 'practice'
  onPass: () => void
  onClose: () => void
}) {
  const bank = QUIZZES[itemId] ?? []
  const [attempt, setAttempt] = useState(0)
  const [stage, setStage] = useState<Stage>(startAt)
  const [picked, setPicked] = useState<(string | null)[]>(() => bank.map(() => null))

  // Shuffled options per attempt so retries can't be memorised by position.
  const questions = useMemo(() => bank.map((q) => ({ ...q, options: shuffle([q.correct, ...q.wrong]) })), [itemId, attempt])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const allAnswered = picked.every((p) => p !== null)
  const results = questions.map((q, i) => picked[i] === q.correct)
  const passed = results.every(Boolean)

  function submit() {
    setStage('result')
    if (passed) onPass()
  }

  function retry() {
    setPicked(bank.map(() => null))
    setAttempt((a) => a + 1)
    setStage('quiz')
  }

  const lcProblems = PRACTICE[itemId] ?? []
  const term = SEARCH_TERMS[itemId] ?? `python ${label}`

  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true">
        <header className="modal-h">
          <div>
            <div className="lbl" style={{ marginTop: 0 }}>
              {stage === 'practice' ? 'Practice' : 'Concept check'}
            </div>
            <h2>{label}</h2>
          </div>
          <button className="x" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        {stage === 'quiz' && (
          <>
            {bank.length === 0 ? (
              <p className="sub">No questions for this topic yet.</p>
            ) : (
              <>
                <p className="sub" style={{ marginTop: 0 }}>
                  Answer all {bank.length} questions correctly to mark this topic complete.
                </p>
                {questions.map((q, i) => (
                  <div key={i} className="qblock">
                    <div className="qtitle">
                      <span className="pill">Q{i + 1}</span> {q.q}
                    </div>
                    {q.code && (
                      <pre className="qcode">
                        <code>{q.code}</code>
                      </pre>
                    )}
                    <div className="opts">
                      {q.options.map((o) => (
                        <button key={o} className={`opt ${picked[i] === o ? 'sel' : ''}`} onClick={() => setPicked((prev) => prev.map((p, k) => (k === i ? o : p)))}>
                          {o}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="row end">
                  <button className="btn ghost" onClick={onClose}>
                    Cancel
                  </button>
                  <button className="btn" disabled={!allAnswered} onClick={submit}>
                    Submit answers
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {stage === 'result' && (
          <>
            <div className={`verdict ${passed ? 'ok' : 'bad'}`}>
              {passed ? '🎉 All correct — topic marked complete!' : `${results.filter(Boolean).length}/${results.length} correct — review and try again.`}
            </div>
            {questions.map((q, i) => (
              <div key={i} className={`qblock res ${results[i] ? 'good' : 'wrong'}`}>
                <div className="qtitle">
                  <span className={`pill ${results[i] ? 'ok' : 'bad'}`}>{results[i] ? '✓' : '✗'}</span> {q.q}
                </div>
                {q.code && (
                  <pre className="qcode">
                    <code>{q.code}</code>
                  </pre>
                )}
                {!results[i] && <div className="ans">Your answer: {picked[i]}</div>}
                <div className="ans good">Correct answer: {q.correct}</div>
                <div className="why">💡 {q.why}</div>
              </div>
            ))}
            <div className="row end">
              {passed ? (
                <>
                  <button className="btn ghost" onClick={onClose}>
                    Close
                  </button>
                  <button className="btn" onClick={() => setStage('practice')}>
                    Practice this concept →
                  </button>
                </>
              ) : (
                <>
                  <button className="btn ghost" onClick={onClose}>
                    Study more
                  </button>
                  <button className="btn" onClick={retry}>
                    Retry quiz
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {stage === 'practice' && (
          <>
            <p className="sub" style={{ marginTop: 0 }}>
              Lock it in with real problems. Links open in a popup window (free problems on LeetCode and GeeksforGeeks).
            </p>
            {lcProblems.length > 0 && (
              <div className="list" style={{ marginBottom: 12 }}>
                {lcProblems.map((p) => (
                  <button key={p.url} className="item plink" onClick={() => openPopup(p.url)}>
                    <span>
                      <strong>{p.title}</strong>
                      <span className="sub"> · LeetCode</span>
                    </span>
                    <span className={`pill ${p.level === 'Easy' ? 'ok' : p.level === 'Hard' ? 'bad' : 'warn'}`}>{p.level}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="row">
              <button className="btn ghost" onClick={() => openPopup(leetcodeSearch(term))}>
                🔎 Search LeetCode
              </button>
              <button className="btn ghost" onClick={() => openPopup(gfgSearch(term))}>
                🔎 Search GeeksforGeeks
              </button>
            </div>
            <div className="row end" style={{ marginTop: 16 }}>
              <button className="btn" onClick={onClose}>
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
