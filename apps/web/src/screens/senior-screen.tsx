import type { Photo, Place } from '@repo/shared'
import { Maximize } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { AlbumPhoto } from '@/components/album-photo'
import { photoHeading } from '@/lib/format'
import { openScreenChannel } from '@/lib/screen-channel'

/** The senior's window: nothing but the album page. Driven by the carer's window. */
export function SeniorScreen({ places }: { places: Place[] }) {
  const [photo, setPhoto] = useState<Photo | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const placesById = useMemo(() => new Map(places.map((place) => [place.id, place])), [places])

  useEffect(() => {
    const channel = openScreenChannel((message) => {
      if (message.type === 'show') setPhoto(message.photo)
    })
    channel.send({ type: 'hello' })
    const onFullscreen = () => setFullscreen(document.fullscreenElement !== null)
    document.addEventListener('fullscreenchange', onFullscreen)
    return () => {
      channel.close()
      document.removeEventListener('fullscreenchange', onFullscreen)
    }
  }, [])

  return (
    <main className="relative flex h-svh flex-col items-center justify-center gap-8 overflow-hidden bg-album p-[4vmin] text-album-foreground">
      {photo ? (
        <>
          <AlbumPhoto key={photo.id} photo={photo} drift className="animate-in fade-in duration-[1500ms]" imageClassName="max-h-[74svh]" />
          <p key={`${photo.id}-caption`} className="animate-in fade-in font-serif text-[clamp(2rem,4vw,3.5rem)] duration-[1500ms]">
            {photoHeading(photo, placesById)}
          </p>
        </>
      ) : (
        <p className="font-serif text-4xl text-album-muted">Pamięć na żywo</p>
      )}
      {!fullscreen && (
        <button
          onClick={() => void document.documentElement.requestFullscreen()}
          className="absolute right-4 bottom-4 flex items-center gap-2 rounded-md px-3 py-2 text-sm text-album-muted hover:text-album-foreground"
        >
          <Maximize className="size-4" aria-hidden />
          Pełny ekran
        </button>
      )}
    </main>
  )
}
