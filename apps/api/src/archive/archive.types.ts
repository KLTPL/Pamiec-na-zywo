import path from 'node:path';
import type { Photo } from '@repo/shared';

/** A photo as stored in data/archive.json: the public Photo plus its search vector. */
export type ArchiveRecord = Photo & { embedding: number[] };

export function dataDir(): string {
  return path.resolve(process.cwd(), process.env.DATA_DIR ?? '../../data');
}
