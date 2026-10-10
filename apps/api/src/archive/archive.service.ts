import { Injectable, NotFoundException } from '@nestjs/common';
import {
  factsFileSchema,
  placesResponseSchema,
  photoSchema,
  type Fact,
  type Photo,
  type Place,
} from '@repo/shared';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { dataDir, type ArchiveRecord } from './archive.types';

const archiveFileSchema = z.array(
  photoSchema.extend({ embedding: z.array(z.number()) }),
);

/** Holds the curated archive in memory; it is small (hundreds of photos) and read-only at runtime. */
@Injectable()
export class ArchiveService {
  private readonly places: Place[];
  private readonly records: ArchiveRecord[];
  private readonly facts: Fact[];

  // Loaded in the constructor so dependent services can build indexes in theirs
  constructor() {
    const dir = dataDir();
    this.places = placesResponseSchema.parse(
      JSON.parse(readFileSync(path.join(dir, 'gazetteer.json'), 'utf8')),
    );
    this.records = archiveFileSchema.parse(
      JSON.parse(readFileSync(path.join(dir, 'archive.json'), 'utf8')),
    );
    this.facts = factsFileSchema.parse(
      JSON.parse(readFileSync(path.join(dir, 'facts.json'), 'utf8')),
    );
  }

  allPlaces(): Place[] {
    return this.places;
  }

  allFacts(): Fact[] {
    return this.facts;
  }

  allRecords(): readonly ArchiveRecord[] {
    return this.records;
  }

  allPhotos(): Photo[] {
    return this.records.map(toPhoto);
  }

  photo(id: string): Photo {
    const record = this.records.find((r) => r.id === id);
    if (!record) throw new NotFoundException(`Unknown photo ${id}`);
    return toPhoto(record);
  }
}

/** Drops the embedding: zod object schemas strip unknown keys. */
export function toPhoto(record: ArchiveRecord): Photo {
  return photoSchema.parse(record);
}
