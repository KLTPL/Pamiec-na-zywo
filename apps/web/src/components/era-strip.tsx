import type { Photo } from '@repo/shared'

const FROM = 1945
const TO = 1975
const TICKS = [1945, 1955, 1965, 1975]

const position = (year: number) => `${((Math.min(TO, Math.max(FROM, year)) - FROM) / (TO - FROM)) * 100}%`

type Props = { birthYear: number; photo: Photo | null }

/** The archive era as a line: the senior's youth is shaded, the current photo is marked. */
export function EraStrip({ birthYear, photo }: Props) {
  const youthFrom = birthYear + 10
  const youthTo = birthYear + 30
  return (
    <figure className="w-full text-album-muted">
      <div className="relative h-3 rounded-full bg-album-foreground/10">
        <div
          className="absolute inset-y-0 rounded-full bg-album-foreground/25"
          style={{ left: position(youthFrom), right: `calc(100% - ${position(youthTo)})` }}
        />
        {photo && (
          <div
            className="absolute -inset-y-1 rounded-full bg-album-foreground"
            style={{
              left: position(photo.yearFrom),
              width: `max(0.5rem, calc(${position(photo.yearTo)} - ${position(photo.yearFrom)}))`,
            }}
          />
        )}
      </div>
      <div className="relative mt-2 h-5 text-sm">
        {TICKS.map((year) => (
          <span key={year} className="absolute -translate-x-1/2 first:translate-x-0 last:-translate-x-full" style={{ left: position(year) }}>
            {year}
          </span>
        ))}
      </div>
      <figcaption className="sr-only">
        Oś lat 1945–1975; jaśniejszy pas to młodość seniora ({youthFrom}–{youthTo})
      </figcaption>
    </figure>
  )
}
