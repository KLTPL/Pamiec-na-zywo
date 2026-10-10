import { z } from 'zod';
import { seniorProfileSchema } from './recall';

/** A quote from the senior together with the photos it was said over. */
export const momentSchema = z.object({
  id: z.string(),
  quote: z.string(),
  photoIds: z.array(z.string()),
  createdAt: z.iso.datetime(),
});

export type Moment = z.infer<typeof momentSchema>;

export const sessionSchema = z.object({
  id: z.string(),
  profile: seniorProfileSchema,
  createdAt: z.iso.datetime(),
  moments: z.array(momentSchema),
});

export type Session = z.infer<typeof sessionSchema>;

export const createMomentRequestSchema = z.object({
  quote: z.string().min(1).max(2000),
  /** Empty when the archive has no photo of what the senior talked about. */
  photoIds: z.array(z.string()).max(12),
});

export type CreateMomentRequest = z.infer<typeof createMomentRequestSchema>;

/** A senior's testimony attached to an archive photo, shared with consent. */
export const annotationSchema = z.object({
  id: z.string(),
  photoId: z.string(),
  quote: z.string(),
  /** How the author wants to be credited, e.g. "Pani Zofia, rocznik 1944". */
  contributor: z.string(),
  createdAt: z.iso.datetime(),
});

export type Annotation = z.infer<typeof annotationSchema>;

export const annotationsResponseSchema = z.array(annotationSchema);

export const createAnnotationRequestSchema = z.object({
  photoId: z.string(),
  quote: z.string().min(1).max(2000),
  contributor: z.string().min(1).max(120),
  consent: z.literal(true),
});

export type CreateAnnotationRequest = z.infer<typeof createAnnotationRequestSchema>;
