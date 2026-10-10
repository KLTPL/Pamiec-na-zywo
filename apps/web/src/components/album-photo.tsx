import type { Photo } from '@repo/shared'
import { cn } from '@/lib/utils'

type Props = {
  photo: Photo
  /** Slow drift across the print; only for the photo currently being talked about. */
  drift?: boolean
  className?: string
  imageClassName?: string
}

const CORNERS = [
  'left-0 top-0 [clip-path:polygon(0_0,100%_0,0_100%)]',
  'right-0 top-0 [clip-path:polygon(0_0,100%_0,100%_100%)]',
  'left-0 bottom-0 [clip-path:polygon(0_0,0_100%,100%_100%)]',
  'right-0 bottom-0 [clip-path:polygon(100%_0,100%_100%,0_100%)]',
]

/** A print mounted on an album page with paper photo corners. */
export function AlbumPhoto({ photo, drift = false, className, imageClassName }: Props) {
  return (
    <div className={cn('relative inline-block max-w-full bg-print p-[2.5%] shadow-[0_18px_40px_-18px_rgb(0_0_0/0.7)]', className)}>
      <div className="overflow-hidden">
        <img
          src={photo.url}
          alt={photo.caption || photo.title}
          className={cn('block h-auto max-w-full sepia-[0.15]', drift && 'print-drift', imageClassName)}
        />
      </div>
      {CORNERS.map((position) => (
        <span key={position} aria-hidden className={cn('absolute size-[9%] max-h-14 max-w-14 bg-album brightness-75', position)} />
      ))}
    </div>
  )
}
