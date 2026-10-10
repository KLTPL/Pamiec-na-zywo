import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import {
  recallRequestSchema,
  type RecallRequest,
  type RecallResponse,
} from '@repo/shared';
import { ZodValidationPipe } from '../zod-validation.pipe';
import { RecallService } from './recall.service';

@Controller('recall')
export class RecallController {
  constructor(private readonly recall: RecallService) {}

  @Post()
  @HttpCode(200)
  run(
    @Body(new ZodValidationPipe(recallRequestSchema)) body: RecallRequest,
  ): Promise<RecallResponse> {
    return this.recall.recall(body);
  }
}
