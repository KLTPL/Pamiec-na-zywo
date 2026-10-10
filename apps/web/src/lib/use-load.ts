import { useEffect, useState } from 'react'

export type Loaded<T> = { kind: 'loading' } | { kind: 'ready'; data: T } | { kind: 'error'; message: string }

/** Runs a loader once per key and exposes loading/error states for the screen to render. */
export function useLoad<T>(load: () => Promise<T>, key: string): Loaded<T> {
  const [state, setState] = useState<Loaded<T>>({ kind: 'loading' })
  useEffect(() => {
    let active = true
    setState({ kind: 'loading' })
    load().then(
      (data) => active && setState({ kind: 'ready', data }),
      (error: unknown) => active && setState({ kind: 'error', message: error instanceof Error ? error.message : String(error) }),
    )
    return () => {
      active = false
    }
    // The key identifies the request; the loader closure changes on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return state
}
