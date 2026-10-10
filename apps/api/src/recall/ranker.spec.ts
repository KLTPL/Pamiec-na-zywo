import type { Place, RecallEntities } from '@repo/shared';
import type { ArchiveRecord } from '../archive/archive.types';
import { rank, youthWindow, type RankInput } from './ranker';

function record(
  id: string,
  placeIds: string[],
  years: [number, number],
  embedding: number[],
): ArchiveRecord {
  return {
    id,
    url: `/api/photos/${id}.jpg`,
    title: id,
    caption: '',
    tags: [],
    yearFrom: years[0],
    yearTo: years[1],
    placeIds,
    author: null,
    source: 'test',
    sourceUrl: '',
    license: 'CC0',
    embedding,
  };
}

const places = new Map<string, Place>([
  [
    'hala-targowa',
    {
      id: 'hala-targowa',
      name: 'Hala Targowa',
      aliases: [],
      lat: 0,
      lon: 0,
      kind: 'market',
    },
  ],
  [
    'rynek',
    { id: 'rynek', name: 'Rynek', aliases: [], lat: 0, lon: 0, kind: 'square' },
  ],
]);

// Unit vectors on separate axes, so dot products are 1 for the same topic and 0 otherwise
const TRAM = [1, 0, 0];
const MARKET = [0, 1, 0];
const OTHER = [0, 0, 1];

const records = [
  record('hala-1950', ['hala-targowa'], [1950, 1950], MARKET),
  record('hala-1965', ['hala-targowa'], [1965, 1966], MARKET),
  record('rynek-1960', ['rynek'], [1960, 1960], OTHER),
  record('tram-1962', [], [1962, 1962], TRAM),
  ...Array.from({ length: 12 }, (_, i) =>
    record(`filler-${i}`, [], [1970, 1970], OTHER),
  ),
];

function input(
  entities: Partial<RecallEntities>,
  overrides: Partial<RankInput> = {},
): RankInput {
  return {
    records,
    places,
    entities: {
      placeIds: [],
      yearFrom: null,
      yearTo: null,
      topics: [],
      ...entities,
    },
    window: { from: 1960, to: 1970 },
    queryVector: null,
    shownIds: new Set(),
    limit: 4,
    ...overrides,
  };
}

describe('rank', () => {
  it('returns photos of the mentioned place, preferring the requested period', () => {
    const ids = rank(input({ placeIds: ['hala-targowa'] })).map(
      (m) => m.photo.id,
    );
    expect(ids).toEqual(['hala-1965', 'hala-1950']);
  });

  it('finds a photo by topic when no place is mentioned', () => {
    const matches = rank(input({ topics: ['tramwaj'] }, { queryVector: TRAM }));
    expect(matches[0].photo.id).toBe('tram-1962');
    expect(matches[0].reasons).toContain('temat: tramwaj');
  });

  it('returns nothing when neither place nor topic is relevant', () => {
    expect(
      rank(input({ topics: ['taniec'] }, { queryVector: [0.5, 0.5, 0.5] })),
    ).toEqual([]);
  });

  it('skips photos that were already shown', () => {
    const ids = rank(
      input(
        { placeIds: ['hala-targowa'] },
        { shownIds: new Set(['hala-1965']) },
      ),
    ).map((m) => m.photo.id);
    expect(ids).toEqual(['hala-1950']);
  });

  it('does not leak embeddings into the response', () => {
    const [match] = rank(input({ placeIds: ['rynek'] }));
    expect(match.photo).not.toHaveProperty('embedding');
  });
});

describe('youthWindow', () => {
  it('covers ages 10–30 clipped to the archive era', () => {
    expect(youthWindow(1955)).toEqual({ from: 1965, to: 1980 });
    expect(youthWindow(1930)).toEqual({ from: 1945, to: 1960 });
  });
});

describe('rank with a small archive', () => {
  it('shows nothing when the closest photo is still below the similarity floor', () => {
    // Four photos: one always stands out by z-score, but 0.79 is not a real match
    const small = [
      record('a', [], [1960, 1960], [0.79, 0.61, 0]),
      record('b', [], [1960, 1960], [0.76, 0.65, 0]),
      record('c', [], [1960, 1960], [0.77, 0.64, 0]),
      record('d', [], [1960, 1960], [0.76, 0.65, 0]),
    ];
    const matches = rank(
      input({ topics: ['pociąg'] }, { records: small, queryVector: [1, 0, 0] }),
    );
    expect(matches).toEqual([]);
  });
});
