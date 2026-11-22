import 'server-only';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { z } from 'zod';
import { AppError, deleteRecord, getRecord, mutateRecord, setRecord } from '@/lib/db';
import { readJson } from '@/lib/http';
import { BodyLimitError, limitedBody } from '@/lib/business/request-body';
import type { ClubActor } from './model';
import { accessDenied, revisionConflict } from './data';
import { CLUB_HOME_BLOCKS, CLUB_LAYOUTS, CLUB_THEMES, DEFAULT_CLUB_APPEARANCE, type ClubAppearance } from './appearance-model';

const photoCollection = 'club-appearance-images';
const maxImage = 3 * 1024 * 1024;
const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const copy = z.strictObject({ title: z.string().trim().max(100), subtitle: z.string().trim().max(200) });
const appearanceInput = z.strictObject({
  revision: z.number().int().positive(),
  theme: z.enum(CLUB_THEMES), layout: z.enum(CLUB_LAYOUTS),
  imageMode: z.enum(['default', 'none', 'upload']),
  home: z.array(z.strictObject({ id: z.enum(CLUB_HOME_BLOCKS), enabled: z.boolean() })).length(CLUB_HOME_BLOCKS.length)
    .refine(blocks => new Set(blocks.map(block => block.id)).size === CLUB_HOME_BLOCKS.length, 'Each home card needs a unique position.'),
  copy: z.strictObject({ de: copy, en: copy }),
});

export async function getClubAppearance(): Promise<ClubAppearance> {
  return await getRecord<ClubAppearance>('club', 'appearance') ?? structuredClone(DEFAULT_CLUB_APPEARANCE);
}

function appearanceAdmin(actor: ClubActor) {
  if (actor.role !== 'admin') accessDenied();
}

async function preparePhoto(file: File) {
  if (!allowedImageTypes.has(file.type) || file.size > maxImage) throw new AppError('Choose a JPEG, PNG, WebP or AVIF image under 3 MB.', 400);
  try {
    const image = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 28_000_000, failOn: 'error' });
    const format = (await image.metadata()).format;
    if (!['jpeg', 'png', 'webp', 'heif'].includes(format ?? '')) throw new Error('Unsupported image');
    return (await image.rotate().resize(1600, 1000, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer()).toString('base64');
  } catch {
    throw new AppError('This image could not be opened. Try a different photo.', 400);
  }
}

export async function saveClubAppearance(actor: ClubActor, request: Request) {
  appearanceAdmin(actor);
  const contentType = request.headers.get('content-type') ?? '';
  let input: unknown;
  let file: File | undefined;
  if (contentType.startsWith('multipart/form-data;')) {
    try {
      const body = await limitedBody(request, maxImage + 24_000);
      const fields = await new Response(new Uint8Array(body), { headers: { 'Content-Type': contentType } }).formData();
      const settings = fields.get('settings');
      if (typeof settings !== 'string' || settings.length > 10_000) throw new Error('Invalid settings');
      input = JSON.parse(settings);
      const image = fields.get('file');
      if (image && !(image instanceof File)) throw new Error('Invalid file');
      file = image instanceof File && image.size ? image : undefined;
    } catch (error) {
      if (error instanceof BodyLimitError) throw new AppError('Choose an image smaller than 3 MB.', 413);
      throw new AppError('The design upload could not be read.', 400);
    }
  } else input = await readJson(request, 10_000);
  const data = appearanceInput.parse(input);
  if (file && data.imageMode !== 'upload') throw new AppError('Choose the uploaded image mode to use this photo.', 400);
  const uploadVersion = file ? randomUUID() : undefined;
  if (uploadVersion && file) await setRecord(photoCollection, uploadVersion, await preparePhoto(file));
  let previousVersion: string | undefined;
  let next: ClubAppearance;
  try {
    next = await mutateRecord('club', 'appearance', DEFAULT_CLUB_APPEARANCE, current => {
      if (data.revision !== current.revision) revisionConflict();
      previousVersion = current.imageVersion;
      const imageVersion = data.imageMode === 'upload' ? uploadVersion ?? current.imageVersion : undefined;
      if (data.imageMode === 'upload' && !imageVersion) throw new AppError('Choose a cover photo first.', 400);
      return { ...data, revision: current.revision + 1, ...(imageVersion ? { imageVersion } : {}) };
    });
  } catch (error) {
    if (uploadVersion) await deleteRecord(photoCollection, uploadVersion).catch(() => {});
    throw error;
  }
  if (previousVersion && previousVersion !== next.imageVersion) await deleteRecord(photoCollection, previousVersion).catch(() => {});
  return next;
}

export async function readClubAppearanceImage(version: string) {
  const appearance = await getClubAppearance();
  if (appearance.imageMode !== 'upload' || appearance.imageVersion !== version) throw new AppError('This photo is unavailable.', 404);
  const encoded = await getRecord<string>(photoCollection, version);
  if (!encoded) throw new AppError('This photo is unavailable.', 404);
  return new Response(new Uint8Array(Buffer.from(encoded, 'base64')), {
    headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}
