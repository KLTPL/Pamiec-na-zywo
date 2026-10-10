import { Controller, Get } from '@nestjs/common';
import type { Photo, Place } from '@repo/shared';
import { ArchiveService } from './archive.service';

@Controller()
export class ArchiveController {
  constructor(private readonly archive: ArchiveService) {}

  @Get('places')
  places(): Place[] {
    return this.archive.allPlaces();
  }

  /** Whole catalogue without vectors: the client uses it for instant place matches. */
  @Get('archive/photos')
  photos(): Photo[] {
    return this.archive.allPhotos();
  }
}
