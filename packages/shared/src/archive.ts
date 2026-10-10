import { z } from 'zod';

export const placeKindSchema = z.enum([
  'square',
  'street',
  'building',
  'market',
  'bridge',
  'monument',
  'park',
  'transport',
]);

/** A place in the demo city fragment; aliases are lowercase phrases people actually say. */
export const placeSchema = z.object({
  id: z.string(),
  name: z.string(),
  aliases: z.array(z.string()),
  lat: z.number(),
  lon: z.number(),
  kind: placeKindSchema,
});

export type Place = z.infer<typeof placeSchema>;

export const placesResponseSchema = z.array(placeSchema);

export const photoSchema = z.object({
  id: z.string(),
  /** Served path under /api/photos/. */
  url: z.string(),
  title: z.string(),
  /** Polish description of what is visible, written for the carer. */
  caption: z.string(),
  tags: z.array(z.string()),
  yearFrom: z.number().int(),
  yearTo: z.number().int(),
  placeIds: z.array(z.string()),
  author: z.string().nullable(),
  source: z.string(),
  sourceUrl: z.string(),
  license: z.string(),
});

export type Photo = z.infer<typeof photoSchema>;

/** A verified anecdote the carer can weave into the conversation. */
export const factSchema = z.object({
  id: z.string(),
  text: z.string(),
  placeIds: z.array(z.string()),
  yearFrom: z.number().int().nullable(),
  yearTo: z.number().int().nullable(),
  source: z.string(),
  sourceUrl: z.string(),
});

export type Fact = z.infer<typeof factSchema>;

export const factsFileSchema = z.array(factSchema);
