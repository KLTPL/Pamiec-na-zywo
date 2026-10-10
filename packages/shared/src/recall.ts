import { z } from 'zod';
import { factSchema, photoSchema } from './archive';

export const seniorProfileSchema = z.object({
  name: z.string().min(1).max(80),
  birthYear: z.number().int().min(1900).max(2010),
  /** Year the senior moved to the city, null if born there. */
  inCitySince: z.number().int().min(1900).max(2030).nullable(),
  /** Free text, e.g. "tramwaje, taniec, krawiectwo". */
  interests: z.string().max(500),
});

export type SeniorProfile = z.infer<typeof seniorProfileSchema>;

export const recallRequestSchema = z.object({
  /** The last ~45 seconds of the conversation. */
  transcript: z.string().min(1).max(4000),
  profile: seniorProfileSchema,
  shownPhotoIds: z.array(z.string()).max(1000),
});

export type RecallRequest = z.infer<typeof recallRequestSchema>;

export const recallEntitiesSchema = z.object({
  placeIds: z.array(z.string()),
  yearFrom: z.number().int().nullable(),
  yearTo: z.number().int().nullable(),
  /** Objects, activities and events mentioned, in Polish. */
  topics: z.array(z.string()),
});

export type RecallEntities = z.infer<typeof recallEntitiesSchema>;

export const photoMatchSchema = z.object({
  photo: photoSchema,
  score: z.number(),
  /** Human-readable reasons, e.g. "miejsce: Hala Targowa". */
  reasons: z.array(z.string()),
});

export type PhotoMatch = z.infer<typeof photoMatchSchema>;

export const recallResponseSchema = z.object({
  entities: recallEntitiesSchema,
  matches: z.array(photoMatchSchema),
  /** Builds on what the senior just said. */
  followUpQuestion: z.string().nullable(),
  /** Gently steers towards places the archive covers; shown when nothing matched. */
  bridgeQuestion: z.string().nullable(),
  /** A curated fact card related to what the senior said, quoted verbatim. */
  fact: factSchema.nullable(),
});

export type RecallResponse = z.infer<typeof recallResponseSchema>;
