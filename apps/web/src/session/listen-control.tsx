import { Mic, MicOff } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { pluralPl } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { RecallStatus } from './use-session-engine'

type Props = {
  supported: boolean
  listening: boolean
  error: string | null
  status: RecallStatus
  onStart: () => void
  onStop: () => void
  onTyped: (text: string) => void
}

function statusText(status: RecallStatus): string | null {
  if (status.kind === 'thinking') return 'Szukam zdjęć do tego, co słyszę…'
  if (status.kind === 'error') return `Nie udało się wyszukać zdjęć: ${status.message}`
  if (status.kind === 'done' && status.found === 0) return 'Nie mam zdjęć do tego tematu, poniżej pytanie, które może pomóc.'
  if (status.kind === 'done') return `Znalazłem ${status.found} ${pluralPl(status.found, 'zdjęcie', 'zdjęcia', 'zdjęć')}.`
  return null
}

/** Microphone, what the model understood, and a typed fallback for noisy rooms or no internet. */
export function ListenControl({ supported, listening, error, status, onStart, onStop, onTyped }: Props) {
  const [typed, setTyped] = useState('')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!typed.trim()) return
    onTyped(typed.trim())
    setTyped('')
  }
  const message = statusText(status)

  return (
    <section aria-label="Słuchanie" className="space-y-4">
      {supported ? (
        <Button
          size="lg"
          onClick={listening ? onStop : onStart}
          className={cn('h-14 w-full text-lg', listening && 'bg-recording hover:bg-recording/90')}
        >
          {listening ? <MicOff /> : <Mic />}
          {listening ? 'Wyłącz mikrofon' : 'Włącz mikrofon'}
        </Button>
      ) : (
        <p className="text-muted-foreground">Ta przeglądarka nie rozpoznaje mowy. Otwórz aplikację w Chrome albo wpisuj zdania poniżej.</p>
      )}
      {listening && (
        <p className="flex items-center gap-2 text-sm">
          <span className="size-2.5 animate-pulse rounded-full bg-recording motion-reduce:animate-none" aria-hidden />
          Słucham
        </p>
      )}
      {error && <p className="text-destructive">{error}</p>}

      {status.kind === 'done' && status.heard.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Usłyszałem:</span>
          {status.heard.map((item) => (
            <span key={item} className="rounded-full bg-secondary px-3 py-1 text-sm">
              {item}
            </span>
          ))}
        </div>
      )}
      {message && <p className={cn('text-sm', status.kind === 'error' ? 'text-destructive' : 'text-muted-foreground')}>{message}</p>}

      <form onSubmit={submit} className="flex gap-2">
        <Input
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          placeholder="Wpisz, co mówi senior"
          aria-label="Wpisz, co mówi senior"
          className="h-11 text-base"
        />
        <Button type="submit" variant="secondary" className="h-11">
          Dodaj
        </Button>
      </form>
    </section>
  )
}
