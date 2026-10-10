import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import path from 'node:path';
import { AppModule } from './app.module';
import { dataDir } from './archive/archive.types';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');
  // Thumbnails live under /api so the Vite dev proxy forwards them like any endpoint
  app.useStaticAssets(path.join(dataDir(), 'photos'), {
    prefix: '/api/photos/',
    maxAge: '1d',
  });
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
