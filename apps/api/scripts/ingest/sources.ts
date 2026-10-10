import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseCsv } from './csv';

export type Source = {
  id: string;
  sourceUrl: string;
  imageUrl: string | null;
  localFile: string | null;
  title: string;
  author: string | null;
  source: string;
  license: string;
  yearFrom: number;
  yearTo: number;
  placeIds: string[];
};

const ALLOWED_LICENSE = /domena publiczna|public domain|^pd\b|cc0|cc by/i;

/** Reads data/sources.csv and fails loudly on rows that would break the archive or the rules. */
export function readSources(
  dataDir: string,
  knownPlaceIds: Set<string>,
): Source[] {
  const rows = parseCsv(
    readFileSync(path.join(dataDir, 'sources.csv'), 'utf8'),
  );
  const seen = new Set<string>();

  return rows.map((row, index) => {
    const where = `sources.csv row ${index + 2} (${row.id || 'no id'})`;
    if (!/^[a-z0-9-]+$/.test(row.id))
      throw new Error(`${where}: id must be a lowercase slug`);
    if (seen.has(row.id)) throw new Error(`${where}: duplicate id`);
    seen.add(row.id);
    if (!row.image_url && !row.local_file)
      throw new Error(`${where}: needs image_url or local_file`);
    if (!ALLOWED_LICENSE.test(row.license))
      throw new Error(`${where}: license "${row.license}" is not PD/CC0/CC-BY`);

    const yearFrom = Number(row.year_from);
    const yearTo = Number(row.year_to || row.year_from);
    if (
      !Number.isInteger(yearFrom) ||
      !Number.isInteger(yearTo) ||
      yearFrom > yearTo
    ) {
      throw new Error(`${where}: invalid year_from/year_to`);
    }

    const placeIds = row.place_ids
      ? row.place_ids.split(';').map((id) => id.trim())
      : [];
    const unknown = placeIds.filter((id) => !knownPlaceIds.has(id));
    if (unknown.length > 0)
      throw new Error(`${where}: unknown place ids ${unknown.join(', ')}`);

    return {
      id: row.id,
      sourceUrl: row.source_url,
      imageUrl: row.image_url || null,
      localFile: row.local_file || null,
      title: row.title,
      author: row.author || null,
      source: row.source,
      license: row.license,
      yearFrom,
      yearTo,
      placeIds,
    };
  });
}
