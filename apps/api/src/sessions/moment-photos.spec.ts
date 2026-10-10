import { momentPhotoIds, type Photo } from '@repo/shared';

const photo = (id: string, placeIds: string[]): Photo => ({
  id,
  url: '',
  title: id,
  caption: '',
  tags: [],
  yearFrom: 1950,
  yearTo: 1950,
  placeIds,
  author: null,
  source: '',
  sourceUrl: '',
  license: 'CC0',
});

const ratusz = photo('ratusz', ['ratusz', 'rynek']);
const uniwersytet = photo('uniwersytet', ['uniwersytet', 'odra']);

describe('momentPhotoIds', () => {
  it('ignores the photo still on screen when the sentence names another place', () => {
    expect(
      momentPhotoIds({
        sentencePlaceIds: ['uniwersytet'],
        shownAtEnd: ratusz,
        candidates: [uniwersytet],
      }),
    ).toEqual(['uniwersytet']);
  });

  it('keeps the memory without a photo when the archive has none of that place', () => {
    expect(
      momentPhotoIds({
        sentencePlaceIds: ['feniks'],
        shownAtEnd: uniwersytet,
        candidates: [],
      }),
    ).toEqual([]);
  });

  it('attaches a comment without place names to the photo being looked at', () => {
    expect(
      momentPhotoIds({
        sentencePlaceIds: [],
        shownAtEnd: ratusz,
        candidates: [],
      }),
    ).toEqual(['ratusz']);
  });

  it('prefers a photo found for the topic over the one on screen', () => {
    expect(
      momentPhotoIds({
        sentencePlaceIds: [],
        shownAtEnd: ratusz,
        candidates: [uniwersytet],
      }),
    ).toEqual(['uniwersytet']);
  });

  it('keeps the photo on screen when the sentence is about its place', () => {
    expect(
      momentPhotoIds({
        sentencePlaceIds: ['rynek'],
        shownAtEnd: ratusz,
        candidates: [ratusz, uniwersytet],
      }),
    ).toEqual(['ratusz']);
  });
});
