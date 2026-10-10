import {
  compilePlacePatterns,
  matchPlaces,
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
/** How much of the conversation the recall request sees. */
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
  const sentencePhotosRef = useRef<string[]>([])
  const recallBusyRef = useRef(false)
  const recallAgainRef = useRef(false)
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
    sentencePhotosRef.current.push(...fresh.map((photo) => photo.id))
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

  /** Tier 1: an exact place name shows that place at once, without waiting for the model. */
  const matchNamedPlaces = useCallback(
    (text: string) => {
      for (const placeId of matchPlaces(text, patterns)) {
        if (placesInSentenceRef.current.has(placeId)) continue
        placesInSentenceRef.current.add(placeId)
        const best = photos
          .filter((photo) => photo.placeIds.includes(placeId) && !shownRef.current.has(photo.id))
          .sort((a, b) => youthDistance(a, profile.birthYear) - youthDistance(b, profile.birthYear))[0]
        if (best) enqueue([best], true)
      }
    },
    [patterns, photos, profile.birthYear, enqueue],
  )

  /** Tier 2: the model reads the recent conversation; one request at a time, latest text wins. */
  const recallOnce = useCallback(async () => {
    setStatus({ kind: 'thinking' })
    const since = Date.now() - CONTEXT_MS
    const transcript = segmentsRef.current
      .filter((segment) => segment.at >= since)
      .map((segment) => segment.text)
      .join(' ')
      .slice(-4000)

    try {
      const result = await api.recall({ transcript, profile, shownPhotoIds: [...shownRef.current] })
      enqueue(
        result.matches.map((match) => match.photo),
        false,
      )
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
    } catch (error) {
      setStatus({ kind: 'error', message: error instanceof Error ? error.message : String(error) })
    }
  }, [profile, placesById, enqueue])

  const runRecall = useCallback(async () => {
    if (recallBusyRef.current) {
      recallAgainRef.current = true
      return
    }
    recallBusyRef.current = true
    // Sentences that arrive during a request are covered by one more request afterwards
    do {
      recallAgainRef.current = false
      await recallOnce()
    } while (recallAgainRef.current)
    recallBusyRef.current = false
  }, [recallOnce])

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

      // Every sentence said over a photo becomes a moment; the carer prunes them on the memory card
      const photoIds = [...new Set([currentRef.current?.id, ...sentencePhotosRef.current])]
        .filter((id): id is string => Boolean(id))
        .slice(0, 3)
      placesInSentenceRef.current = new Set()
      sentencePhotosRef.current = []
      if (photoIds.length > 0 && text.split(/\s+/).length >= MIN_MOMENT_WORDS) {
        api.addMoment(sessionId, { quote: text, photoIds }).then(
          () => setSaveError(null),
          (error: unknown) => setSaveError(error instanceof Error ? error.message : String(error)),
        )
      }
      void runRecall()
    },
    [matchNamedPlaces, runRecall, sessionId],
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
