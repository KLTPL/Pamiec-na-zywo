import { Injectable } from '@nestjs/common';
import type { Annotation, CreateAnnotationRequest } from '@repo/shared';
import { ArchiveService } from '../archive/archive.service';
import type { Annotation as AnnotationRow } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

function toAnnotation(row: AnnotationRow): Annotation {
  return {
    id: row.id,
    photoId: row.photoId,
    quote: row.quote,
    contributor: row.contributor,
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class AnnotationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly archive: ArchiveService,
  ) {}

  async list(photoId?: string): Promise<Annotation[]> {
    const rows = await this.prisma.annotation.findMany({
      where: photoId ? { photoId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toAnnotation);
  }

  async create({
    photoId,
    quote,
    contributor,
  }: CreateAnnotationRequest): Promise<Annotation> {
    this.archive.photo(photoId); // throws 404 for unknown photos
    const row = await this.prisma.annotation.create({
      data: { photoId, quote, contributor },
    });
    return toAnnotation(row);
  }
}
