import { useCallback, useEffect, useRef, useState } from 'react'

const SR: any = typeof window !== 'undefined' ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null

const speechSupported = !!SR

/**
 * Browser-built-in speech recognition. No API keys or tokens.
 * onFinal is called with each finalized chunk of text.
 */
export function useDictation(onFinal: (text: string) => void) {
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState('')
  const recRef = useRef<any>(null)
  const cb = useRef(onFinal)
  cb.current = onFinal

  const stop = useCallback(() => {
    recRef.current?.stop()
  }, [])

  const start = useCallback(() => {
    if (!SR) return
    setError('')
    const rec = new SR()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = navigator.language || 'en-US'
    rec.onresult = (e: any) => {
      let live = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) cb.current(r[0].transcript.trim())
        else live += r[0].transcript
      }
      setInterim(live)
    }
    rec.onerror = (e: any) => {
      if (e.error === 'not-allowed') setError('Microphone permission denied.')
      else if (e.error === 'no-speech') setError('')
      else setError(`Voice error: ${e.error}`)
    }
    rec.onend = () => {
      setListening(false)
      setInterim('')
    }
    recRef.current = rec
    try {
      rec.start()
      setListening(true)
    } catch {
      /* already started */
    }
  }, [])

  const toggle = useCallback(() => (listening ? stop() : start()), [listening, start, stop])

  useEffect(() => () => recRef.current?.abort(), [])

  return { supported: speechSupported, listening, interim, error, start, stop, toggle }
}
