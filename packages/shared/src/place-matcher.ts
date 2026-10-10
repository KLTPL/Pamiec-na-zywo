import type { Place } from './archive';

/** Lowercase, strip Polish diacritics (ł does not decompose in NFD) and split into words. */
export function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export type PlacePattern = { placeId: string; words: { stem: string; prefix: boolean }[] };

/** Compiles gazetteer aliases once; "świdnick*" matches as a prefix, plain words match exactly. */
export function compilePlacePatterns(places: readonly Place[]): PlacePattern[] {
  return places
    .flatMap((place) =>
      place.aliases.map((alias) => ({
        placeId: place.id,
        words: alias.split(/\s+/).flatMap((word) => {
          const prefix = word.endsWith('*');
          return normalizeWords(word).map((stem) => ({ stem, prefix }));
        }),
      })),
    )
    .sort((a, b) => b.words.length - a.words.length);
}

/**
 * Finds places mentioned in the text, in order of first mention. Longer aliases win on
 * overlap, so "piwnica świdnicka" is not also reported as "ulica Świdnicka".
 */
export function matchPlaces(text: string, patterns: readonly PlacePattern[]): string[] {
  const words = normalizeWords(text);
  const taken = new Array<boolean>(words.length).fill(false);
  const hits: { placeId: string; index: number }[] = [];

  for (const pattern of patterns) {
    for (let start = 0; start + pattern.words.length <= words.length; start++) {
      const span = pattern.words.every((p, offset) => {
        const word = words[start + offset];
        return !taken[start + offset] && (p.prefix ? word.startsWith(p.stem) : word === p.stem);
      });
      if (!span) continue;
      pattern.words.forEach((_, offset) => (taken[start + offset] = true));
      hits.push({ placeId: pattern.placeId, index: start });
    }
  }

  const ordered = hits.sort((a, b) => a.index - b.index).map((hit) => hit.placeId);
  return [...new Set(ordered)];
}
