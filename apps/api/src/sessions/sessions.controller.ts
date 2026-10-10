import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  createAnnotationRequestSchema,
  createMomentRequestSchema,
  seniorProfileSchema,
  type Annotation,
  type CreateAnnotationRequest,
  type CreateMomentRequest,
  type Moment,
  type SeniorProfile,
  type Session,
} from '@repo/shared';
import { ZodValidationPipe } from '../zod-validation.pipe';
import { AnnotationsService } from './annotations.service';
import { SessionsService } from './sessions.service';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Post()
  create(
    @Body(new ZodValidationPipe(seniorProfileSchema)) profile: SeniorProfile,
  ): Promise<Session> {
    return this.sessions.create(profile);
  }

  @Get(':id')
  get(@Param('id') id: string): Promise<Session> {
    return this.sessions.get(id);
  }

  @Post(':id/moments')
  addMoment(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createMomentRequestSchema))
    body: CreateMomentRequest,
  ): Promise<Moment> {
    return this.sessions.addMoment(id, body);
  }

  @Delete(':id/moments/:momentId')
  @HttpCode(204)
  removeMoment(
    @Param('id') id: string,
    @Param('momentId') momentId: string,
  ): Promise<void> {
    return this.sessions.removeMoment(id, momentId);
  }
}

@Controller('annotations')
export class AnnotationsController {
  constructor(private readonly annotations: AnnotationsService) {}

  @Get()
  list(@Query('photoId') photoId?: string): Promise<Annotation[]> {
    return this.annotations.list(photoId);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createAnnotationRequestSchema))
    body: CreateAnnotationRequest,
  ): Promise<Annotation> {
    return this.annotations.create(body);
  }
}
