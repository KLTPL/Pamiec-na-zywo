import type { Photo, Place, Session } from '@repo/shared'
import { MonitorUp } from 'lucide-react'
import { useMemo } from 'react'
import { AlbumPhoto } from '@/components/album-photo'
import { EraStrip } from '@/components/era-strip'
import { MiniMap } from '@/components/mini-map'
import { Button } from '@/components/ui/button'
import { useSpeechRecognition } from '@/hooks/use-speech-recognition'
import { photoCredit, photoHeading } from '@/lib/format'
import { paths } from '@/lib/router'
import { ListenControl } from '@/session/listen-control'
import { PromptCard, Transcript } from '@/session/prompt-card'
import { useSessionEngine } from '@/session/use-session-engine'

type Props = { session: Session; photos: Photo[]; places: Place[] }

export function SessionScreen({ session, photos, places }: Props) {
  const engine = useSessionEngine({ sessionId: session.id, profile: session.profile, photos, places })
  const speech = useSpeechRecognition({ onInterim: engine.handleInterim, onFinal: engine.handleFinal })
  const { current, placesById } = engine
  const title = `${session.profile.address === 'pani' ? 'Pani' : 'Pan'} ${session.profile.name}`

  const photoPlaces = useMemo(
    () => (current?.placeIds ?? []).map((id) => placesById.get(id)).filter((p): p is Place => Boolean(p)),
    [current, placesById],
  )
  const mentionedPlaces = useMemo(() => {
    const heard = engine.status.kind === 'done' ? engine.status.heard : []
    return places.filter((place) => heard.includes(place.name))
  }, [engine.status, places])

  return (
    <main className="grid min-h-svh lg:h-svh lg:grid-cols-[minmax(0,1fr)_24rem] xl:grid-cols-[minmax(0,1fr)_27rem]">
      <section className="flex min-h-0 flex-col gap-6 bg-album p-8 text-album-foreground">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-serif text-2xl">Rozmowa: {title}</h1>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => window.open(paths.screen, 'pamiec-ekran', 'popup')}>
              <MonitorUp />
              Ekran seniora
            </Button>
            <Button variant="secondary" onClick={() => (window.location.hash = paths.card(session.id))}>
              Zakończ i zobacz wspomnienia
            </Button>
          </div>
        </header>

        <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-4">
          {current ? (
            <>
              <AlbumPhoto key={current.id} photo={current} drift className="animate-in fade-in duration-1000" imageClassName="max-h-[52svh]" />
              <div className="w-full max-w-3xl text-center">
                <p className="font-serif text-3xl">{photoHeading(current, placesById)}</p>
                <p className="mt-1 text-album-muted">{current.caption}</p>
                <p className="mt-1 text-sm text-album-muted/80">{photoCredit(current)}</p>
              </div>
            </>
          ) : (
            <p className="max-w-md text-center font-serif text-2xl text-album-muted">
              Włącz mikrofon i zapytaj o miejsce z młodości. Zdjęcia pojawią się tutaj.
            </p>
          )}
        </div>

        <EraStrip birthYear={session.profile.birthYear} photo={current} />

        {engine.found.length > 0 && (
          <nav aria-label="Znalezione zdjęcia" className="flex gap-3 overflow-x-auto pb-1">
            {engine.found.map((photo) => (
              <button
                key={photo.id}
                onClick={() => engine.showNow(photo)}
                aria-label={`Pokaż: ${photoHeading(photo, placesById)}`}
                aria-current={photo.id === current?.id}
                className="shrink-0 rounded-sm outline-offset-4 aria-[current=true]:ring-2 aria-[current=true]:ring-album-foreground"
              >
                <img src={photo.url} alt="" className="h-20 w-auto bg-print p-1" />
              </button>
            ))}
          </nav>
        )}
      </section>

      <aside className="space-y-8 overflow-y-auto p-6" aria-label="Panel opiekuna">
        <ListenControl
          supported={speech.supported}
          listening={speech.listening}
          error={speech.error}
          status={engine.status}
          onStart={speech.start}
          onStop={speech.stop}
          onTyped={engine.handleFinal}
        />
        {engine.saveError && <p className="text-destructive">Nie zapisano wspomnienia: {engine.saveError}</p>}
        <PromptCard prompt={engine.prompt} />
        <MiniMap photoPlaces={photoPlaces} mentionedPlaces={mentionedPlaces} />
        <Transcript segments={engine.segments} interim={engine.interim} />
      </aside>
    </main>
  )
}
