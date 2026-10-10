import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ArchiveModule } from './archive/archive.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { RecallModule } from './recall/recall.module';
import { SessionsModule } from './sessions/sessions.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    ArchiveModule,
    RecallModule,
    SessionsModule,
  ],
})
export class AppModule {}
