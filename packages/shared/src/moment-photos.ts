import type { Photo } from './archive';

const MAX_PHOTOS = 2;

type Input = {
  /** Places named or referred to in this very sentence. */
  sentencePlaceIds: readonly string[];
  /** The photo on the senior's screen when the sentence ended. */
  shownAtEnd: Photo | null;
  /** Photos found for this sentence: by place name first, then by the model's search. */
  candidates: readonly Photo[];
};

/**
 * Which photos a sentence is about. A sentence naming places belongs to photos of those
 * places, even if another photo is still on screen; a sentence without places belongs to
 * a photo found for its topic, or else it is a comment on the photo being looked at.
 * An empty result means the memory is kept without a photo.
 */
export function momentPhotoIds({ sentencePlaceIds, shownAtEnd, candidates }: Input): string[] {
  if (sentencePlaceIds.length > 0) {
    const wanted = new Set(sentencePlaceIds);
    const relevant = [shownAtEnd, ...candidates].filter(
      (photo): photo is Photo => photo !== null && photo.placeIds.some((id) => wanted.has(id)),
    );
    return [...new Set(relevant.map((photo) => photo.id))].slice(0, MAX_PHOTOS);
  }
  if (candidates.length > 0) return [candidates[0].id];
  return shownAtEnd ? [shownAtEnd.id] : [];
}
