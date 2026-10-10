import type { PhotoMatch, Place, RecallEntities } from '@repo/shared';
import type { ArchiveRecord } from '../archive/archive.types';
import { toPhoto } from '../archive/archive.service';
import { dot } from './embedder';

export type YearWindow = { from: number; to: number };

export type RankInput = {
  records: readonly ArchiveRecord[];
  places: ReadonlyMap<string, Place>;
  entities: RecallEntities;
  window: YearWindow;
  queryVector: number[] | null;
  shownIds: ReadonlySet<string>;
  limit: number;
};

const WEIGHTS = { place: 3, time: 1, semantic: 2 };
// E5 similarities sit in a narrow band, so relevance is judged against the archive's spread
const SEMANTIC_MIN_Z = 1.5;

/** Years the senior was 10–30, clipped to the archive era; used when the speech gives no period. */
export function youthWindow(birthYear: number): YearWindow {
  return {
    from: Math.max(1945, birthYear + 10),
    to: Math.min(1975, birthYear + 30),
  };
}

function timeScore(record: ArchiveRecord, window: YearWindow): number {
  if (record.yearTo >= window.from && record.yearFrom <= window.to) return 1;
  const gap =
    record.yearFrom > window.to
      ? record.yearFrom - window.to
      : window.from - record.yearTo;
  return Math.max(0, 1 - gap / 15);
}

function zScores(values: number[]): number[] {
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const std =
    Math.sqrt(
      values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length,
    ) || 1;
  return values.map((v) => (v - mean) / std);
}

/**
 * Hybrid ranking: a photo qualifies by showing a mentioned place or by being semantically
 * close to the mentioned topics; the period only reorders qualifying photos.
 */
export function rank(input: RankInput): PhotoMatch[] {
  const { records, entities, window, queryVector, shownIds } = input;
  const wanted = new Set(entities.placeIds);
  const z = queryVector
    ? zScores(records.map((r) => dot(r.embedding, queryVector)))
    : null;

  return records
    .map((record, i) => {
      const placeIds = record.placeIds.filter((id) => wanted.has(id));
      const semanticZ = z ? z[i] : 0;
      const semantic = Math.min(1, Math.max(0, (semanticZ - 0.5) / 2.5));
      const time = timeScore(record, window);
      const relevant = placeIds.length > 0 || semanticZ >= SEMANTIC_MIN_Z;

      const reasons = [
        ...placeIds.map((id) => `miejsce: ${input.places.get(id)?.name ?? id}`),
        ...(semanticZ >= SEMANTIC_MIN_Z
          ? [`temat: ${entities.topics.join(', ')}`]
          : []),
        ...(time === 1 ? [`lata: ${record.yearFrom}–${record.yearTo}`] : []),
      ];
      const score =
        WEIGHTS.place * (placeIds.length > 0 ? 1 : 0) +
        WEIGHTS.time * time +
        WEIGHTS.semantic * semantic;
      return { record, relevant, score, reasons };
    })
    .filter(
      (candidate) => candidate.relevant && !shownIds.has(candidate.record.id),
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, input.limit)
    .map(({ record, score, reasons }) => ({
      photo: toPhoto(record),
      score: +score.toFixed(3),
      reasons,
    }));
}
