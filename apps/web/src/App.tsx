import { ScreenState } from '@/components/screen-state'
import { api } from '@/lib/api'
import { useRoute } from '@/lib/router'
import { useLoad } from '@/lib/use-load'
import { ArchiveScreen } from '@/screens/archive-screen'
import { MemoryCardScreen } from '@/screens/memory-card-screen'
import { SeniorScreen } from '@/screens/senior-screen'
import { SessionScreen } from '@/screens/session-screen'
import { StartScreen } from '@/screens/start-screen'

const loadCatalogue = () => Promise.all([api.places(), api.photos()]).then(([places, photos]) => ({ places, photos }))

function App() {
  const route = useRoute()
  const routeKey = route.name === 'session' || route.name === 'card' ? `${route.name}:${route.id}` : route.name

  const state = useLoad(async () => {
    const catalogue = await loadCatalogue()
    if (route.name === 'session' || route.name === 'card') return { ...catalogue, session: await api.session(route.id), annotations: [] }
    if (route.name === 'archive') return { ...catalogue, session: null, annotations: await api.annotations() }
    return { ...catalogue, session: null, annotations: [] }
  }, routeKey)

  return (
    <ScreenState state={state}>
      {({ places, photos, session, annotations }) => {
        if (route.name === 'screen') return <SeniorScreen places={places} />
        if (route.name === 'archive') return <ArchiveScreen photos={photos} places={places} annotations={annotations} />
        if (route.name === 'session' && session) return <SessionScreen session={session} photos={photos} places={places} />
        if (route.name === 'card' && session) return <MemoryCardScreen session={session} photos={photos} places={places} />
        return <StartScreen photos={photos} />
      }}
    </ScreenState>
  )
}

export default App
