import type Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { ARCHIVE_ERA, type Place } from '@repo/shared';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { CLAUDE_MODEL, fallbackOptions } from '../../src/claude';
import type { Source } from './sources';

const enrichmentSchema = z.object({
  suitable: z.boolean(),
  unsuitableReason: z.string().nullable(),
  caption: z.string(),
  tags: z.array(z.string()),
  placeIds: z.array(z.string()),
});

export type Enrichment = z.infer<typeof enrichmentSchema>;

const SYSTEM_PROMPT = `Opisujesz archiwalne zdjęcia Wrocławia z lat ${ARCHIVE_ERA.from}–${ARCHIVE_ERA.to} do aplikacji, w której opiekun rozmawia z seniorem o jego wspomnieniach.

Zwróć:
- caption: 1–2 zdania po polsku o tym, co konkretnie widać: miejsce, ludzie, pojazdy, szyldy, pora roku. Bez ocen i domysłów, bez zwrotu „zdjęcie przedstawia”.
- tags: 5–12 rzeczowników w mianowniku liczby pojedynczej, małymi literami: przedmioty, pojazdy, czynności i rodzaje miejsc (np. „tramwaj”, „stragan”, „kawiarnia”, „neon”).
- placeIds: wyłącznie id z podanej listy miejsc, które naprawdę widać na zdjęciu; pusta lista, jeśli nie masz pewności.
- suitable: false, jeśli głównym tematem jest polityka (pochód, wiec, propaganda), religia (kościół, nabożeństwo) albo przemoc wojenna; wtedy unsuitableReason to krótki powód, w przeciwnym razie null.`;

/** Describes one photo with Claude vision; results are cached in data/enrichment/<id>.json. */
export async function enrich(
  client: Anthropic,
  dataDir: string,
  source: Source,
  thumbnail: string,
  places: Place[],
): Promise<Enrichment> {
  const cacheFile = path.join(dataDir, 'enrichment', `${source.id}.json`);
  if (existsSync(cacheFile)) {
    return enrichmentSchema.parse(JSON.parse(readFileSync(cacheFile, 'utf8')));
  }

  const placeList = places
    .map((place) => `${place.id}: ${place.name}`)
    .join('\n');
  const response = await client.beta.messages.parse({
    model: CLAUDE_MODEL,
    max_tokens: 2000,
    ...fallbackOptions(),
    output_config: {
      effort: 'medium',
      format: betaZodOutputFormat(enrichmentSchema),
    },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: readFileSync(thumbnail).toString('base64'),
            },
          },
          {
            type: 'text',
            text: `Tytuł w archiwum: ${source.title}\nLata: ${source.yearFrom}–${source.yearTo}\nŹródło: ${source.source}\n\nMiejsca:\n${placeList}`,
          },
        ],
      },
    ],
  });

  if (response.stop_reason === 'refusal')
    throw new Error(`${source.id}: Claude declined to describe the photo`);
  if (!response.parsed_output)
    throw new Error(
      `${source.id}: no structured output (stop: ${response.stop_reason})`,
    );

  const known = new Set(places.map((place) => place.id));
  const enrichment = {
    ...response.parsed_output,
    placeIds: response.parsed_output.placeIds.filter((id) => known.has(id)),
  };
  mkdirSync(path.dirname(cacheFile), { recursive: true });
  writeFileSync(cacheFile, JSON.stringify(enrichment, null, 2) + '\n');
  return enrichment;
}
