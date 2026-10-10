import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import type { Source } from './sources';

const USER_AGENT = 'PamiecNaZywo/0.1 (BEST Hacks 2026 hackathon project)';
const MAX_ATTEMPTS = 4;

/** Wikimedia answers 429 when several large originals are fetched at once; wait and retry. */
async function download(url: string): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (response.status !== 429 || attempt === MAX_ATTEMPTS) return response;
    const retryAfter = Number(response.headers.get('retry-after'));
    const waitMs =
      (Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter
        : 5 * attempt) * 1000;
    console.log(
      `  429 from ${new URL(url).host}, retrying in ${waitMs / 1000}s`,
    );
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
}

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

  const response = await download(source.imageUrl!);
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
