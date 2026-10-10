import type { Moment, Photo, Place, Session } from '@repo/shared'
import { Printer, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AlbumPhoto } from '@/components/album-photo'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'
import { photoHeading, pluralPl } from '@/lib/format'
import { paths } from '@/lib/router'

type Props = { session: Session; photos: Photo[]; places: Place[] }

export function MemoryCardScreen({ session, photos, places }: Props) {
  const [moments, setMoments] = useState<Moment[]>(session.moments)
  const [error, setError] = useState<string | null>(null)
  const photosById = useMemo(() => new Map(photos.map((photo) => [photo.id, photo])), [photos])
  const placesById = useMemo(() => new Map(places.map((place) => [place.id, place])), [places])
  const { profile } = session
  // Nominative on purpose: declining names automatically ("Pani Zofii") is unreliable
  const owner = `${profile.address === 'pani' ? 'Pani' : 'Pan'} ${profile.name}`

  const remove = async (momentId: string) => {
    try {
      await api.removeMoment(session.id, momentId)
      setMoments((previous) => previous.filter((moment) => moment.id !== momentId))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <main className="mx-auto max-w-4xl space-y-10 p-8 print:p-0">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl">{owner} wspomina</h1>
          <p className="mt-2 text-muted-foreground">
            Rozmowa z {new Date(session.createdAt).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button variant="secondary" onClick={() => (window.location.hash = paths.session(session.id))}>
            Wróć do rozmowy
          </Button>
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer />
            Drukuj
          </Button>
        </div>
      </header>

      {error && <p className="text-destructive">{error}</p>}
      {moments.length === 0 && (
        <p className="text-muted-foreground">
          W tej rozmowie nie zapisało się jeszcze żadne wspomnienie. Każde zdanie wypowiedziane przy zdjęciu trafia tutaj automatycznie.
        </p>
      )}

      <ol className="space-y-12">
        {moments.map((moment) => {
          const photo = moment.photoIds.map((id) => photosById.get(id)).find(Boolean)
          return (
            <li key={moment.id} className="grid items-center gap-6 break-inside-avoid sm:grid-cols-[16rem_1fr]">
              {photo && (
                <figure className="rounded-md bg-album p-4">
                  <AlbumPhoto photo={photo} />
                  <figcaption className="mt-3 text-sm text-album-foreground">{photoHeading(photo, placesById)}</figcaption>
                </figure>
              )}
              <div className="space-y-3">
                <blockquote className="font-serif text-2xl leading-snug text-pretty">„{moment.quote}”</blockquote>
                <Button variant="ghost" size="sm" onClick={() => void remove(moment.id)} className="print:hidden">
                  <Trash2 />
                  Usuń
                </Button>
              </div>
            </li>
          )
        })}
      </ol>

      {moments.length > 0 && <ShareToArchive session={session} moments={moments} />}
    </main>
  )
}

/** Sends the kept quotes to the archive as testimonies, only with the senior's consent. */
function ShareToArchive({ session, moments }: { session: Session; moments: Moment[] }) {
  const { profile } = session
  const [contributor, setContributor] = useState(
    `${profile.address === 'pani' ? 'Pani' : 'Pan'} ${profile.name}, rocznik ${profile.birthYear}`,
  )
  const [consent, setConsent] = useState(false)
  const [state, setState] = useState<{ kind: 'idle' } | { kind: 'sending' } | { kind: 'sent'; count: number } | { kind: 'error'; message: string }>({ kind: 'idle' })

  const share = async () => {
    setState({ kind: 'sending' })
    try {
      const requests = moments.flatMap((moment) =>
        moment.photoIds.map((photoId) => api.createAnnotation({ photoId, quote: moment.quote, contributor, consent: true })),
      )
      await Promise.all(requests)
      setState({ kind: 'sent', count: moments.length })
    } catch (err) {
      setState({ kind: 'error', message: err instanceof Error ? err.message : String(err) })
    }
  }

  return (
    <section className="space-y-4 rounded-md bg-card p-6 print:hidden">
      <h2 className="font-serif text-2xl">Przekaż do archiwum</h2>
      <p className="text-muted-foreground">
        Wspomnienia zostaną przypięte do zdjęć jako relacje świadka. Muzeum i inni zobaczą cytat i podpis, nic więcej.
      </p>
      <div className="max-w-md space-y-2">
        <Label htmlFor="contributor">Podpis pod relacją</Label>
        <Input id="contributor" value={contributor} onChange={(e) => setContributor(e.target.value)} className="h-11" />
      </div>
      <Label className="flex items-start gap-3 font-normal">
        <Checkbox checked={consent} onCheckedChange={(value) => setConsent(value === true)} className="mt-1" />
        Senior (albo jego opiekun prawny) zgadza się na udostępnienie tych wspomnień w archiwum.
      </Label>
      {state.kind === 'sent' ? (
        <p>
          Przekazano {state.count} {pluralPl(state.count, 'wspomnienie', 'wspomnienia', 'wspomnień')} do archiwum.{' '}
          <a href={paths.archive} className="text-primary underline-offset-4 hover:underline">
            Zobacz archiwum
          </a>
        </p>
      ) : (
        <Button onClick={() => void share()} disabled={!consent || !contributor.trim() || state.kind === 'sending'}>
          Przekaż do archiwum
        </Button>
      )}
      {state.kind === 'error' && <p className="text-destructive">Nie udało się przekazać: {state.message}</p>}
    </section>
  )
}
