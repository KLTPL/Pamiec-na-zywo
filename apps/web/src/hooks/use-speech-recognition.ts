import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

// lib.dom ships the event types but not the recognizer itself (Chrome exposes it prefixed)
type Recognizer = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

type RecognizerConstructor = new () => Recognizer

function recognizerConstructor(): RecognizerConstructor | null {
  const w = window as unknown as { SpeechRecognition?: RecognizerConstructor; webkitSpeechRecognition?: RecognizerConstructor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

const ERROR_MESSAGES: Record<string, string> = {
  'not-allowed': 'Przeglądarka nie ma dostępu do mikrofonu. Zezwól na mikrofon w ustawieniach strony.',
  'audio-capture': 'Nie wykryto mikrofonu. Podłącz mikrofon i spróbuj ponownie.',
  network: 'Rozpoznawanie mowy wymaga internetu. Sprawdź połączenie albo wpisuj zdania ręcznie.',
}

type Options = {
  onInterim: (text: string) => void
  onFinal: (text: string) => void
}

/**
 * Continuous Polish dictation. Chrome ends a recognition session after silence,
 * so it is restarted for as long as the carer keeps the microphone on.
 */
export function useSpeechRecognition({ onInterim, onFinal }: Options) {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recognizerRef = useRef<Recognizer | null>(null)
  const wantedRef = useRef(false)
  const handlersRef = useRef({ onInterim, onFinal })
  useLayoutEffect(() => {
    handlersRef.current = { onInterim, onFinal }
  })
  const supported = recognizerConstructor() !== null

  const start = useCallback(() => {
    const Constructor = recognizerConstructor()
    if (!Constructor) return
    const recognizer = new Constructor()
    recognizer.lang = 'pl-PL'
    recognizer.continuous = true
    recognizer.interimResults = true

    recognizer.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const text = result[0].transcript.trim()
        if (result.isFinal) {
          if (text) handlersRef.current.onFinal(text)
        } else {
          interim += `${text} `
        }
      }
      handlersRef.current.onInterim(interim.trim())
    }
    recognizer.onerror = (event) => {
      // "no-speech" and "aborted" are routine; onend restarts the session
      if (event.error === 'no-speech' || event.error === 'aborted') return
      wantedRef.current = false
      setError(ERROR_MESSAGES[event.error] ?? `Rozpoznawanie mowy przerwane (${event.error}).`)
    }
    recognizer.onend = () => {
      if (wantedRef.current) {
        recognizer.start()
      } else {
        setListening(false)
        handlersRef.current.onInterim('')
      }
    }

    recognizerRef.current = recognizer
    wantedRef.current = true
    setError(null)
    setListening(true)
    recognizer.start()
  }, [])

  const stop = useCallback(() => {
    wantedRef.current = false
    recognizerRef.current?.stop()
  }, [])

  useEffect(() => stop, [stop])

  return { supported, listening, error, start, stop }
}
