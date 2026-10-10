import 'dotenv/config';
import { placesResponseSchema, type Place } from '@repo/shared';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { dataDir } from '../../src/archive/archive.types';
import type { ArchiveRecord } from '../../src/archive/archive.types';
import { createClaude } from '../../src/claude';
import { embed } from '../../src/recall/embedder';
import { enrich } from './enrich';
import { readSources, type Source } from './sources';
import { ensureThumbnail } from './thumbnails';

const CONCURRENCY = 4;

async function forEachLimited<T>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<void>,
) {
  let next = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (next < items.length) await task(items[next++]);
    },
  );
  await Promise.all(workers);
}

/** Text the photo is searched by: archive title, Claude's caption, tags and place names. */
function passage(
  record: Omit<ArchiveRecord, 'embedding'>,
  places: Map<string, Place>,
): string {
  const placeNames = record.placeIds
    .map((id) => places.get(id)?.name)
    .filter(Boolean);
  return [
    record.title,
    record.caption,
    record.tags.join(', '),
    placeNames.join(', '),
  ].join('. ');
}

async function main() {
  const dir = dataDir();
  const places = placesResponseSchema.parse(
    JSON.parse(readFileSync(path.join(dir, 'gazetteer.json'), 'utf8')),
  );
  const placesById = new Map(places.map((place) => [place.id, place]));
  const sources = readSources(dir, new Set(placesById.keys()));
  const client = createClaude();

  const records: Omit<ArchiveRecord, 'embedding'>[] = [];
  const excluded: string[] = [];

  await forEachLimited(sources, CONCURRENCY, async (source: Source) => {
    const thumbnail = await ensureThumbnail(dir, source);
    const enrichment = await enrich(client, dir, source, thumbnail, places);
    if (!enrichment.suitable) {
      excluded.push(`${source.id}: ${enrichment.unsuitableReason}`);
      return;
    }
    records.push({
      id: source.id,
      url: `/api/photos/${source.id}.jpg`,
      title: source.title,
      caption: enrichment.caption,
      tags: enrichment.tags,
      yearFrom: source.yearFrom,
      yearTo: source.yearTo,
      // Curated place ids win; Claude's suggestions fill the gaps
      placeIds:
        source.placeIds.length > 0 ? source.placeIds : enrichment.placeIds,
      author: source.author,
      source: source.source,
      sourceUrl: source.sourceUrl,
      license: source.license,
    });
    console.log(`✓ ${source.id}`);
  });

  records.sort((a, b) => a.id.localeCompare(b.id));
  const vectors =
    records.length > 0
      ? await embed(
          records.map((record) => passage(record, placesById)),
          'passage',
        )
      : [];
  const archive: ArchiveRecord[] = records.map((record, i) => ({
    ...record,
    embedding: vectors[i].map((v) => +v.toFixed(5)),
  }));
  writeFileSync(path.join(dir, 'archive.json'), JSON.stringify(archive) + '\n');

  console.log(`\narchive.json: ${archive.length} photos`);
  if (excluded.length > 0)
    console.log(`excluded as unsuitable:\n  ${excluded.join('\n  ')}`);
}

void main();
