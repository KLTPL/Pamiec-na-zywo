import { Injectable, NotFoundException } from '@nestjs/common';
import {
  seniorProfileSchema,
  type CreateMomentRequest,
  type Moment,
  type SeniorProfile,
  type Session,
} from '@repo/shared';
import { ArchiveService } from '../archive/archive.service';
import type {
  Moment as MomentRow,
  Session as SessionRow,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

function toMoment(row: MomentRow): Moment {
  return {
    id: row.id,
    quote: row.quote,
    photoIds: row.photoIds,
    createdAt: row.createdAt.toISOString(),
  };
}

function toSession(row: SessionRow & { moments: MomentRow[] }): Session {
  return {
    id: row.id,
    profile: seniorProfileSchema.parse(row.profile),
    createdAt: row.createdAt.toISOString(),
    moments: row.moments.map(toMoment),
  };
}

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly archive: ArchiveService,
  ) {}

  async create(profile: SeniorProfile): Promise<Session> {
    const row = await this.prisma.session.create({
      data: { profile },
      include: { moments: true },
    });
    return toSession(row);
  }

  async get(id: string): Promise<Session> {
    const row = await this.prisma.session.findUnique({
      where: { id },
      include: { moments: { orderBy: { createdAt: 'asc' } } },
    });
    if (!row) throw new NotFoundException(`Unknown session ${id}`);
    return toSession(row);
  }

  async addMoment(
    sessionId: string,
    { quote, photoIds }: CreateMomentRequest,
  ): Promise<Moment> {
    photoIds.forEach((id) => this.archive.photo(id)); // throws 404 for unknown photos
    await this.get(sessionId);
    const row = await this.prisma.moment.create({
      data: { sessionId, quote, photoIds },
    });
    return toMoment(row);
  }

  async removeMoment(sessionId: string, momentId: string): Promise<void> {
    const { count } = await this.prisma.moment.deleteMany({
      where: { id: momentId, sessionId },
    });
    if (count === 0) throw new NotFoundException(`Unknown moment ${momentId}`);
  }
}
