import { compilePlacePatterns, matchPlaces, type Place } from '@repo/shared';

const place = (id: string, aliases: string[]): Place => ({
  id,
  name: id,
  aliases,
  lat: 0,
  lon: 0,
  kind: 'street',
});

const patterns = compilePlacePatterns([
  place('swidnicka', ['świdnick*']),
  place('piwnica-swidnicka', ['piwnic* świdnick*']),
  place('hala-targowa', ['hal* targow*']),
  place('opera', ['opera', 'opery', 'operze']),
  place('pomnik-fredry', ['fredr*']),
]);

describe('matchPlaces', () => {
  it('matches inflected forms and ignores case and diacritics', () => {
    expect(
      matchPlaces(
        'Chodziliśmy po ŚWIDNICKIEJ, a potem na halę targową',
        patterns,
      ),
    ).toEqual(['swidnicka', 'hala-targowa']);
  });

  it('prefers the longer alias on overlap', () => {
    expect(matchPlaces('w piwnicy świdnickiej grała muzyka', patterns)).toEqual(
      ['piwnica-swidnicka'],
    );
  });

  it('matches exact words only when the alias has no asterisk', () => {
    expect(matchPlaces('po operacji wróciłam do opery', patterns)).toEqual([
      'opera',
    ]);
  });

  it('keeps the order of first mention without duplicates', () => {
    expect(
      matchPlaces(
        'spotkanie pod Fredrą, potem Świdnicka i znowu pod Fredrą',
        patterns,
      ),
    ).toEqual(['pomnik-fredry', 'swidnicka']);
  });
});
