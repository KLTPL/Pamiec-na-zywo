import { Module } from '@nestjs/common';
import { ExtractorService } from './extractor.service';
import { RecallController } from './recall.controller';
import { RecallService } from './recall.service';

@Module({
  controllers: [RecallController],
  providers: [ExtractorService, RecallService],
})
export class RecallModule {}
