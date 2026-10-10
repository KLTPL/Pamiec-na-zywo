import type { Loaded } from '@/lib/use-load'

/** Loading and error states shared by all screens; renders children only when data is ready. */
export function ScreenState<T>({ state, children }: { state: Loaded<T>; children: (data: T) => React.ReactNode }) {
  if (state.kind === 'loading') return <p className="p-10 text-muted-foreground">Wczytuję…</p>
  if (state.kind === 'error') {
    return (
      <div className="max-w-xl p-10">
        <h1 className="font-serif text-2xl">Nie udało się wczytać danych</h1>
        <p className="mt-3 text-muted-foreground">{state.message}</p>
        <p className="mt-3 text-muted-foreground">Sprawdź, czy API działa (pnpm dev) i czy zbiór jest przygotowany (pnpm ingest).</p>
      </div>
    )
  }
  return <>{children(state.data)}</>
}
