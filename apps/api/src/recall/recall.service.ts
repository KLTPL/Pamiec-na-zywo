import { Injectable } from '@nestjs/common';
import {
  compilePlacePatterns,
  matchPlaces,
  type Place,
  type PlacePattern,
  type RecallRequest,
  type RecallResponse,
} from '@repo/shared';
import { ArchiveService } from '../archive/archive.service';
import { embed } from './embedder';
import { ExtractorService } from './extractor.service';
import { rank, youthWindow } from './ranker';

const MATCH_LIMIT = 4;

@Injectable()
export class RecallService {
  private readonly patterns: PlacePattern[];
  private readonly places: Map<string, Place>;

  constructor(
    private readonly archive: ArchiveService,
    private readonly extractor: ExtractorService,
  ) {
    this.patterns = compilePlacePatterns(archive.allPlaces());
    this.places = new Map(
      archive.allPlaces().map((place) => [place.id, place]),
    );
  }

  async recall({
    transcript,
    profile,
    shownPhotoIds,
  }: RecallRequest): Promise<RecallResponse> {
    const extraction = await this.extractor.extract(transcript, profile);

    // Aliases catch exact names even if the model misses them; the model adds descriptive mentions
    const placeIds = [
      ...new Set([
        ...matchPlaces(transcript, this.patterns),
        ...extraction.placeIds,
      ]),
    ].filter((id) => this.places.has(id));
    const entities = {
      placeIds,
      yearFrom: extraction.yearFrom,
      yearTo: extraction.yearTo,
      topics: extraction.topics,
    };

    const window =
      entities.yearFrom !== null && entities.yearTo !== null
        ? { from: entities.yearFrom, to: entities.yearTo }
        : youthWindow(profile.birthYear);
    const queryVector =
      entities.topics.length > 0
        ? (await embed([entities.topics.join(', ')], 'query'))[0]
        : null;

    const matches = rank({
      records: this.archive.allRecords(),
      places: this.places,
      entities,
      window,
      queryVector,
      shownIds: new Set(shownPhotoIds),
      limit: MATCH_LIMIT,
    });

    return {
      entities,
      matches,
      followUpQuestion: extraction.followUpQuestion,
      bridgeQuestion: extraction.bridgeQuestion,
      // Only a card from facts.json is ever shown; an invented id simply yields no fact
      fact:
        this.archive.allFacts().find((fact) => fact.id === extraction.factId) ??
        null,
    };
  }
}
