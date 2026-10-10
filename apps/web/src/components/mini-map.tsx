import type { Place } from '@repo/shared'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'

const OLD_TOWN: L.LatLngExpression = [51.1085, 17.0335]

type Props = {
  /** Places shown in the current photo. */
  photoPlaces: Place[]
  /** Places mentioned in the conversation so far. */
  mentionedPlaces: Place[]
}

export function MiniMap({ photoPlaces, mentionedPlaces }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const map = L.map(containerRef.current, { zoomControl: false, attributionControl: true }).setView(OLD_TOWN, 15)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap',
      className: 'grayscale-[0.85] sepia-[0.25]',
    }).addTo(map)
    mapRef.current = map
    layerRef.current = L.layerGroup().addTo(map)
    return () => {
      map.remove()
    }
  }, [])

  useEffect(() => {
    const layer = layerRef.current
    const map = mapRef.current
    if (!layer || !map) return
    layer.clearLayers()
    const styles = getComputedStyle(document.documentElement)
    const primary = styles.getPropertyValue('--primary').trim()
    const muted = styles.getPropertyValue('--muted-foreground').trim()

    for (const place of mentionedPlaces) {
      L.circleMarker([place.lat, place.lon], { radius: 6, color: muted, weight: 2, fillOpacity: 0.3 })
        .bindTooltip(place.name)
        .addTo(layer)
    }
    for (const place of photoPlaces) {
      L.circleMarker([place.lat, place.lon], { radius: 10, color: primary, weight: 3, fillOpacity: 0.6 })
        .bindTooltip(place.name, { permanent: true, direction: 'top', offset: [0, -8] })
        .addTo(layer)
    }
    const focus = photoPlaces[0] ?? mentionedPlaces.at(-1)
    if (focus) map.flyTo([focus.lat, focus.lon], 16, { duration: 1.2 })
  }, [photoPlaces, mentionedPlaces])

  return <div ref={containerRef} className="h-56 w-full overflow-hidden rounded-md border" role="img" aria-label="Mapa Starego Miasta" />
}
