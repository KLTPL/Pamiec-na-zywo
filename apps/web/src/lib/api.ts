import {
  annotationSchema,
  annotationsResponseSchema,
  momentSchema,
  photoSchema,
  placesResponseSchema,
  recallResponseSchema,
  sessionSchema,
  type CreateAnnotationRequest,
  type CreateMomentRequest,
  type RecallRequest,
  type SeniorProfile,
} from '@repo/shared'

type Schema<T> = { parse: (data: unknown) => T }

/** Prefers the API's own error message (Nest sends { message }) over the raw body. */
async function errorMessage(res: Response): Promise<string> {
  if (res.headers.get('content-type')?.includes('application/json')) {
    const body = (await res.json()) as { message?: unknown }
    if (typeof body.message === 'string') return `${body.message} (HTTP ${res.status})`
  }
  return `HTTP ${res.status}`
}

async function request<T>(path: string, schema: Schema<T>, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init)
  if (!res.ok) throw new Error(await errorMessage(res))
  return schema.parse(await res.json())
}

const post = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export const api = {
  places: () => request('/api/places', placesResponseSchema),
  photos: () => request('/api/archive/photos', photoSchema.array()),
  createSession: (profile: SeniorProfile) => request('/api/sessions', sessionSchema, post(profile)),
  session: (id: string) => request(`/api/sessions/${id}`, sessionSchema),
  addMoment: (sessionId: string, body: CreateMomentRequest) =>
    request(`/api/sessions/${sessionId}/moments`, momentSchema, post(body)),
  removeMoment: async (sessionId: string, momentId: string) => {
    const res = await fetch(`/api/sessions/${sessionId}/moments/${momentId}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(await errorMessage(res))
  },
  recall: (body: RecallRequest) => request('/api/recall', recallResponseSchema, post(body)),
  annotations: () => request('/api/annotations', annotationsResponseSchema),
  createAnnotation: (body: CreateAnnotationRequest) => request('/api/annotations', annotationSchema, post(body)),
}
