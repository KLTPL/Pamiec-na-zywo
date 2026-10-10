import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import type { Source } from './sources';

const USER_AGENT = 'PamiecNaZywo/0.1 (BEST Hacks 2026 hackathon project)';

async function originalPath(dataDir: string, source: Source): Promise<string> {
  const dir = path.join(dataDir, 'originals');
  if (source.localFile) {
    const file = path.join(dir, source.localFile);
    if (!existsSync(file))
      throw new Error(
        `${source.id}: missing data/originals/${source.localFile}`,
      );
    return file;
  }

  const file = path.join(dir, source.id);
  if (existsSync(file)) return file;

  const response = await fetch(source.imageUrl!, {
    headers: { 'User-Agent': USER_AGENT },
  });
  const type = response.headers.get('content-type') ?? '';
  if (!response.ok || !type.startsWith('image/')) {
    throw new Error(
      `${source.id}: download failed (${response.status}, ${type}) from ${source.imageUrl}`,
    );
  }
  mkdirSync(dir, { recursive: true });
  writeFileSync(file, Buffer.from(await response.arrayBuffer()));
  return file;
}

/** Downloads the original once and writes a 1280 px JPEG to data/photos/<id>.jpg. */
export async function ensureThumbnail(
  dataDir: string,
  source: Source,
): Promise<string> {
  const output = path.join(dataDir, 'photos', `${source.id}.jpg`);
  if (existsSync(output)) return output;

  mkdirSync(path.dirname(output), { recursive: true });
  await sharp(await originalPath(dataDir, source))
    .rotate()
    .resize({
      width: 1280,
      height: 1280,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(output);
  return output;
}
