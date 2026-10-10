import { useEffect, useState } from 'react'

export type Route =
  | { name: 'start' }
  | { name: 'session'; id: string }
  | { name: 'card'; id: string }
  | { name: 'screen' }
  | { name: 'archive' }

/** Hash routes keep the app a static bundle and let the senior screen open in its own window. */
export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  if (parts[0] === 'sesja' && parts[1] && parts[2] === 'karta') return { name: 'card', id: parts[1] }
  if (parts[0] === 'sesja' && parts[1]) return { name: 'session', id: parts[1] }
  if (parts[0] === 'ekran') return { name: 'screen' }
  if (parts[0] === 'archiwum') return { name: 'archive' }
  return { name: 'start' }
}

export const paths = {
  start: '#/',
  session: (id: string) => `#/sesja/${id}`,
  card: (id: string) => `#/sesja/${id}/karta`,
  screen: '#/ekran',
  archive: '#/archiwum',
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash))
  useEffect(() => {
    const onChange = () => setRoute(parseRoute(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}
