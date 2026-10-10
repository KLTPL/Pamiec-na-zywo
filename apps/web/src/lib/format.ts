import type { Photo, Place } from '@repo/shared'

export function yearsLabel(photo: Pick<Photo, 'yearFrom' | 'yearTo'>): string {
  return photo.yearFrom === photo.yearTo ? `rok ${photo.yearFrom}` : `lata ${photo.yearFrom}–${photo.yearTo}`
}

/** "Hala Targowa, rok 1965": the first place the photo shows, or its archive title. */
export function photoHeading(photo: Photo, places: ReadonlyMap<string, Place>): string {
  const place = photo.placeIds.map((id) => places.get(id)?.name).find(Boolean)
  return `${place ?? photo.title}, ${yearsLabel(photo)}`
}

export function photoCredit(photo: Photo): string {
  return [photo.author, photo.source, photo.license].filter(Boolean).join(', ')
}

/** Polish plural: 1 zdjęcie, 2–4 zdjęcia, 5+ zdjęć (12–14 take the "many" form). */
export function pluralPl(count: number, one: string, few: string, many: string): string {
  if (count === 1) return one
  const lastTwo = count % 100
  const last = count % 10
  return last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14) ? few : many
}
