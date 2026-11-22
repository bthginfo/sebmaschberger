import 'server-only';
import sharp from 'sharp';
import { AppError, deleteRecord, getRecord, setRecord } from '@/lib/db';
import { limitedBody, BodyLimitError } from '@/lib/business/request-body';
import { accessDenied, canEditPerson, canReadClubPerson, clubDirectory, updateDirectory } from './data';
import type { ClubActor } from './model';

const maxUpload = 3 * 1024 * 1024;
const avatarTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

export async function readAvatar(actor: ClubActor, id: string) {
  const directory = await clubDirectory();
  const person = directory.people.find(value => value.id === id);
  if (!person?.avatar || !canReadClubPerson(actor, person, directory.teams)) throw new AppError('This photo is unavailable.', 404);
  const encoded = await getRecord<string>('club-avatars', id);
  if (!encoded) throw new AppError('This photo is unavailable.', 404);
  return new Response(new Uint8Array(Buffer.from(encoded, 'base64')), {
    headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}

export async function updateAvatar(actor: ClubActor, id: string, request?: Request) {
  const person = (await clubDirectory()).people.find(value => value.id === id);
  if (!person || !canEditPerson(actor, person)) accessDenied();
  if (request) {
    const type = request.headers.get('content-type') ?? '';
    if (!type.startsWith('multipart/form-data;')) throw new AppError('Choose a JPEG, PNG, WebP or AVIF image.', 415);
    let body: Uint8Array;
    try {
      body = await limitedBody(request, maxUpload + 16_384);
    } catch (error) {
      if (error instanceof BodyLimitError) throw new AppError('Choose an image smaller than 3 MB.', 413);
      throw error;
    }
    let file: FormDataEntryValue | null;
    try {
      const form = await new Response(new Uint8Array(body), { headers: { 'Content-Type': type } }).formData();
      file = form.get('file');
    } catch {
      throw new AppError('This upload could not be read.', 400);
    }
    if (!(file instanceof File) || !avatarTypes.has(file.type) || file.size > maxUpload) throw new AppError('Choose a JPEG, PNG, WebP or AVIF image under 3 MB.', 400);
    let output: Buffer;
    try {
      const image = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 16_000_000, failOn: 'error' });
      const format = (await image.metadata()).format;
      if (!['jpeg', 'png', 'webp', 'heif'].includes(format ?? '')) throw new Error('Unsupported image');
      output = await image.rotate().resize(384, 384, { fit: 'cover', withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
    } catch {
      throw new AppError('This image could not be opened. Try a different photo.', 400);
    }
    await setRecord('club-avatars', id, output.toString('base64'));
  } else {
    await deleteRecord('club-avatars', id);
  }
  await updateDirectory(directory => ({
    ...directory,
    people: directory.people.map(value => value.id === id ? { ...value, avatar: Boolean(request), revision: value.revision + 1 } : value),
  }));
}
