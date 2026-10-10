import { ARCHIVE_ERA, type Annotation, type Photo, type Place } from '@repo/shared'
import { useMemo } from 'react'
import { AlbumPhoto } from '@/components/album-photo'
import { photoCredit, photoHeading } from '@/lib/format'
import { paths } from '@/lib/router'

type Props = { photos: Photo[]; places: Place[]; annotations: Annotation[] }

/** What a museum gets back: archive photos described by the people who remember them. */
export function ArchiveScreen({ photos, places, annotations }: Props) {
  const placesById = useMemo(() => new Map(places.map((place) => [place.id, place])), [places])
  const byPhoto = useMemo(() => {
    const grouped = new Map<string, Annotation[]>()
    for (const annotation of annotations) grouped.set(annotation.photoId, [...(grouped.get(annotation.photoId) ?? []), annotation])
    return grouped
  }, [annotations])
  // Photos with testimonies first: they are the point of this view
  const ordered = [...photos].sort((a, b) => (byPhoto.get(b.id)?.length ?? 0) - (byPhoto.get(a.id)?.length ?? 0))

  return (
    <main className="mx-auto max-w-6xl space-y-10 p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="font-serif text-4xl">Archiwum wspomnień</h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Zdjęcia Wrocławia z lat {ARCHIVE_ERA.from}–{ARCHIVE_ERA.to} z relacjami osób, które je pamiętają. Relacje trafiają tu z rozmów, za zgodą seniorów.
          </p>
        </div>
        <a href={paths.start} className="text-muted-foreground underline-offset-4 hover:underline">
          Nowa rozmowa
        </a>
      </header>

      {photos.length === 0 && <p className="text-muted-foreground">Zbiór jest pusty. Dodaj zdjęcia do data/sources.csv i uruchom pnpm ingest.</p>}

      <ul className="grid gap-10 md:grid-cols-2">
        {ordered.map((photo) => (
          <li key={photo.id} className="space-y-4">
            <div className="rounded-md bg-album p-5">
              <AlbumPhoto photo={photo} />
            </div>
            <div>
              <h2 className="font-serif text-xl">{photoHeading(photo, placesById)}</h2>
              <p className="mt-1 text-muted-foreground">{photo.caption}</p>
              <a href={photo.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 block text-sm text-muted-foreground underline-offset-4 hover:underline">
                {photoCredit(photo)}
              </a>
            </div>
            {(byPhoto.get(photo.id) ?? []).map((annotation) => (
              <blockquote key={annotation.id} className="border-l-4 border-primary/40 pl-4">
                <p className="font-serif text-lg leading-snug">„{annotation.quote}”</p>
                <footer className="mt-1 text-sm text-muted-foreground">{annotation.contributor}</footer>
              </blockquote>
            ))}
          </li>
        ))}
      </ul>
    </main>
  )
}
