import { Module } from '@nestjs/common';
import { AnnotationsService } from './annotations.service';
import {
  AnnotationsController,
  SessionsController,
} from './sessions.controller';
import { SessionsService } from './sessions.service';

@Module({
  controllers: [SessionsController, AnnotationsController],
  providers: [SessionsService, AnnotationsService],
})
export class SessionsModule {}
