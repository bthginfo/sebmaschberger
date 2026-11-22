import 'server-only';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { get, put } from '@vercel/blob';
import { AppError } from '@/lib/db';
import { clientRequired, staffOnly } from './access';
import { mediaAccess } from './program';
import type { Media } from './program';
import type { ActorView } from './model';
import { read, save } from './store';

const fileLimit = 4 * 1024 * 1024;
const storageFolder = join(process.cwd(), '.data', 'portal-files');
function detect(bytes: Uint8Array) {
  const sample = Buffer.from(bytes.subarray(0, 16));
  if (sample.toString('ascii', 0, 5) === '%PDF-') return 'application/pdf';
  if (sample[0] === 0xff && sample[1] === 0xd8 && sample[2] === 0xff) return 'image/jpeg';
  if (sample.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  if (sample.toString('ascii', 0, 4) === 'RIFF' && sample.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (sample.toString('ascii', 4, 8) === 'ftyp') return 'video/mp4';
  return '';
}
export async function upload(actor: ActorView, request: Request) {
  if (!request.headers.get('content-type')?.startsWith('multipart/form-data') ||
    Number(request.headers.get('content-length') || 0) > fileLimit + 15000) throw new AppError('Die maximale Dateigröße beträgt 4 MB.', 413);
  const form = await request.formData();
  const file = form.get('file'), rawClient = form.get('client');
  const purpose = form.get('purpose') === 'chat' ? 'chat' : 'plan';
  if (purpose === 'plan') staffOnly(actor);
  const client = (purpose === 'chat' || rawClient) ? (await clientRequired(actor, typeof rawClient === 'string' ? rawClient || null : null)).id : null;
  if (!(file instanceof File) || file.size < 8 || file.size > fileLimit) throw new AppError('Wähle eine Datei bis 4 MB.');
  const data = new Uint8Array(await file.arrayBuffer()), type = detect(data);
  if (!type) throw new AppError('Verwende PDF, JPEG, PNG, WebP oder MP4.');
  const id = randomUUID(), pathname = 'coaching-portal/media/' + id;
  if (process.env.NODE_ENV === 'production') await put(pathname, Buffer.from(data), { access: 'private', contentType: type, addRandomSuffix: false });
  else {
    await mkdir(storageFolder, { recursive: true, mode: 0o700 });
    await writeFile(join(storageFolder, id), data, { mode: 0o600, flag: 'wx' });
  }
  await save<Media>('files', id, { id, client, owner: actor.id, pathname, name: file.name.slice(0, 150), type, purpose });
  return { href: '/api/coaching-portal/file/' + id, name: file.name.slice(0, 150), type };
}
export async function serveFile(actor: ActorView, id: string, request: Request) {
  if (!/^[a-f0-9-]{36}$/iu.test(id)) throw new AppError('Datei nicht verfügbar.', 404);
  const media = await read<Media>('files', id);
  if (!media) throw new AppError('Datei nicht verfügbar.', 404);
  await mediaAccess(actor, media);
  let bytes: Uint8Array;
  if (process.env.NODE_ENV === 'production') {
    const blob = await get(media.pathname, { access: 'private', useCache: false });
    if (!blob || blob.statusCode !== 200) throw new AppError('Datei nicht verfügbar.', 404);
    bytes = new Uint8Array(await new Response(blob.stream).arrayBuffer());
  } else bytes = new Uint8Array(await readFile(join(storageFolder, id)));
  const headers: Record<string, string> = { 'Content-Type': media.type, 'Cache-Control': 'private, no-store',
    'Content-Disposition': 'inline', 'X-Content-Type-Options': 'nosniff', 'Accept-Ranges': 'bytes' };
  const range = /^bytes=(\d+)-(\d*)$/u.exec(request.headers.get('range') ?? '');
  if (!range) return new Response(Uint8Array.from(bytes), { headers });
  const start = Number(range[1]), end = Math.min(range[2] ? Number(range[2]) : bytes.length - 1, bytes.length - 1);
  if (start > end) return new Response(null, { status: 416, headers: { ...headers, 'Content-Range': 'bytes */' + bytes.length } });
  headers['Content-Range'] = `bytes ${start}-${end}/${bytes.length}`;
  return new Response(Uint8Array.from(bytes.subarray(start, end + 1)), { status: 206, headers });
}
