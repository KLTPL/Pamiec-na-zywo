import {
  compilePlacePatterns,
  matchPlaces,
  momentPhotoIds,
  type Fact,
  type Photo,
  type Place,
  type SeniorProfile,
} from '@repo/shared'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { openScreenChannel } from '@/lib/screen-channel'

/** A photo stays on the senior's screen at least this long, so it never flickers. */
const DWELL_MS = 9000
/** Prompts for the carer appear only once the senior pauses. */
const SILENCE_MS = 4000
/** How much earlier conversation the model sees to resolve "tam" or "wtedy". */
const CONTEXT_MS = 45000
const MIN_MOMENT_WORDS = 4

export type Segment = { id: number; text: string; at: number }

export type Prompt = {
  followUp: string | null
  bridge: string | null
  fact: Fact | null
  /** The model understood the sentence but the archive had no matching photo. */
  nothingFound: boolean
}

export type RecallStatus =
  | { kind: 'idle' }
  | { kind: 'thinking' }
  | { kind: 'done'; heard: string[]; found: number }
  | { kind: 'error'; message: string }

type Options = {
  sessionId: string
  profile: SeniorProfile
  photos: Photo[]
  places: Place[]
}

function youthDistance(photo: Photo, birthYear: number): number {
  const from = birthYear + 10
  const to = birthYear + 30
  if (photo.yearTo >= from && photo.yearFrom <= to) return 0
  return photo.yearFrom > to ? photo.yearFrom - to : from - photo.yearTo
}

export function useSessionEngine({ sessionId, profile, photos, places }: Options) {
  const placesById = useMemo(() => new Map(places.map((place) => [place.id, place])), [places])
  const patterns = useMemo(() => compilePlacePatterns(places), [places])

  const [current, setCurrent] = useState<Photo | null>(null)
  const [found, setFound] = useState<Photo[]>([])
  const [segments, setSegments] = useState<Segment[]>([])
  const [interim, setInterim] = useState('')
  const [status, setStatus] = useState<RecallStatus>({ kind: 'idle' })
  const [prompt, setPrompt] = useState<Prompt | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const currentRef = useRef<Photo | null>(null)
  const currentSinceRef = useRef(0)
  const queueRef = useRef<Photo[]>([])
  const shownRef = useRef(new Set<string>())
  const segmentsRef = useRef<Segment[]>([])
  const lastSpeechAtRef = useRef(0)
  const pendingPromptRef = useRef<Prompt | null>(null)
  const placesInSentenceRef = useRef(new Set<string>())
  const channelRef = useRef<ReturnType<typeof openScreenChannel> | null>(null)

  const display = useCallback((photo: Photo) => {
    queueRef.current = queueRef.current.filter((queued) => queued.id !== photo.id)
    shownRef.current.add(photo.id)
    currentRef.current = photo
    currentSinceRef.current = Date.now()
    setCurrent(photo)
    channelRef.current?.send({ type: 'show', photo })
  }, [])

  /** Urgent photos (a place just named) jump the queue; recall results wait their turn. */
  const enqueue = useCallback((incoming: Photo[], urgent: boolean) => {
    const fresh = incoming.filter((photo) => !shownRef.current.has(photo.id))
    if (fresh.length === 0) return
    fresh.forEach((photo) => shownRef.current.add(photo.id))
    queueRef.current = urgent ? [...fresh, ...queueRef.current] : [...queueRef.current, ...fresh]
    setFound((previous) => [...fresh, ...previous])
  }, [])

  useEffect(() => {
    const channel = openScreenChannel((message) => {
      if (message.type === 'hello') channel.send({ type: 'show', photo: currentRef.current })
    })
    channelRef.current = channel
    return () => channel.close()
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now()
      const next = queueRef.current[0]
      if (next && (!currentRef.current || now - currentSinceRef.current >= DWELL_MS)) display(next)
      if (pendingPromptRef.current && now - lastSpeechAtRef.current >= SILENCE_MS) {
        setPrompt(pendingPromptRef.current)
        pendingPromptRef.current = null
      }
    }, 500)
    return () => clearInterval(timer)
  }, [display])

  /** Photos of a place, closest to the senior's youth first. */
  const photosOf = useCallback(
    (placeId: string) =>
      photos
        .filter((photo) => photo.placeIds.includes(placeId))
        .sort((a, b) => youthDistance(a, profile.birthYear) - youthDistance(b, profile.birthYear)),
    [photos, profile.birthYear],
  )

  /** Tier 1: an exact place name shows that place at once, without waiting for the model. */
  const matchNamedPlaces = useCallback(
    (text: string) => {
      for (const placeId of matchPlaces(text, patterns)) {
        if (placesInSentenceRef.current.has(placeId)) continue
        placesInSentenceRef.current.add(placeId)
        const unseen = photosOf(placeId).find((photo) => !shownRef.current.has(photo.id))
        if (unseen) enqueue([unseen], true)
      }
    },
    [patterns, photosOf, enqueue],
  )

  /** Saves a sentence as a memory, attached only to photos of what it is about. */
  const saveMoment = useCallback(
    (quote: string, sentencePlaceIds: string[], shownAtEnd: Photo | null, found: Photo[]) => {
      if (quote.split(/\s+/).length < MIN_MOMENT_WORDS) return
      const candidates = [...found, ...sentencePlaceIds.flatMap(photosOf)]
      const photoIds = momentPhotoIds({ sentencePlaceIds, shownAtEnd, candidates })
      api.addMoment(sessionId, { quote, photoIds }).then(
        () => setSaveError(null),
        (error: unknown) => setSaveError(error instanceof Error ? error.message : String(error)),
      )
    },
    [photosOf, sessionId],
  )

  /**
   * Tier 2: one request per sentence. Earlier sentences go along as context only, so the
   * model's places refer to this sentence; only the newest sentence updates the prompt.
   */
  const recallSentence = useCallback(
    async (segment: Segment, namedPlaceIds: string[], shownAtEnd: Photo | null) => {
      const since = segment.at - CONTEXT_MS
      const context = segmentsRef.current
        .filter((earlier) => earlier.id < segment.id && earlier.at >= since)
        .map((earlier) => earlier.text)
        .join(' ')
        .slice(-4000)
      const isLatest = () => segmentsRef.current.at(-1)?.id === segment.id

      setStatus({ kind: 'thinking' })
      try {
        const result = await api.recall({ transcript: segment.text, context, profile, shownPhotoIds: [...shownRef.current] })
        const foundPhotos = result.matches.map((match) => match.photo)
        enqueue(foundPhotos, false)
        const sentencePlaceIds = [...new Set([...namedPlaceIds, ...result.entities.placeIds])]
        saveMoment(segment.text, sentencePlaceIds, shownAtEnd, foundPhotos)

        if (isLatest()) {
          const { entities } = result
          const heard = [
            ...entities.placeIds.map((id) => placesById.get(id)?.name ?? id),
            ...entities.topics,
            ...(entities.yearFrom !== null && entities.yearTo !== null ? [`lata ${entities.yearFrom}–${entities.yearTo}`] : []),
          ]
          setStatus({ kind: 'done', heard, found: result.matches.length })
          pendingPromptRef.current = {
            followUp: result.followUpQuestion,
            bridge: result.bridgeQuestion,
            fact: result.fact,
            nothingFound: result.matches.length === 0,
          }
        }
      } catch (error) {
        // The memory must not depend on the model: keep it, attributed by the place names heard
        saveMoment(segment.text, namedPlaceIds, shownAtEnd, [])
        if (isLatest()) setStatus({ kind: 'error', message: error instanceof Error ? error.message : String(error) })
      }
    },
    [profile, placesById, enqueue, saveMoment],
  )

  const handleInterim = useCallback(
    (text: string) => {
      setInterim(text)
      if (!text) return
      lastSpeechAtRef.current = Date.now()
      matchNamedPlaces(text)
    },
    [matchNamedPlaces],
  )

  const handleFinal = useCallback(
    (text: string) => {
      lastSpeechAtRef.current = Date.now()
      matchNamedPlaces(text)
      const segment = { id: segmentsRef.current.length, text, at: Date.now() }
      segmentsRef.current = [...segmentsRef.current, segment]
      setSegments(segmentsRef.current)
      setInterim('')

      const namedPlaceIds = [...placesInSentenceRef.current]
      placesInSentenceRef.current = new Set()
      void recallSentence(segment, namedPlaceIds, currentRef.current)
    },
    [matchNamedPlaces, recallSentence],
  )

  return {
    current,
    found,
    segments,
    interim,
    status,
    prompt,
    saveError,
    placesById,
    handleInterim,
    handleFinal,
    showNow: display,
  }
}
