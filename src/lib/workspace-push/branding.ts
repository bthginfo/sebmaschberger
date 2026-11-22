import 'server-only';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { AppError, deleteRecord, getRecord, mutateRecord, setRecord } from '@/lib/db';
import { BodyLimitError, limitedBody } from '@/lib/business/request-body';

export const brandIconKinds = ['favicon', 'cms', 'member'] as const;
export type BrandIconKind = (typeof brandIconKinds)[number];
type Size = '32' | '180' | '192' | '512' | 'maskable';
type BrandIcon = { version?: string };
const registry = 'workspace-brand-icons';
const storage = 'workspace-brand-assets';
const maxUpload = 3 * 1024 * 1024;

export async function brandIconVersion(kind: BrandIconKind) {
  return (await getRecord<BrandIcon>(registry, kind))?.version;
}

function sizes(kind: BrandIconKind): Size[] {
  return kind === 'favicon' ? ['32'] : ['180', '192', '512', 'maskable'];
}

export function brandIconPath(kind: BrandIconKind, size: Size, version?: string) {
  return '/workspace-branding/' + kind + '-' + size + '.png' + (version ? '?v=' + encodeURIComponent(version) : '');
}

export async function brandIconSummary() {
  return Object.fromEntries(await Promise.all(brandIconKinds.map(async kind => {
    const version = await brandIconVersion(kind);
    return [kind, { version, href: brandIconPath(kind, kind === 'favicon' ? '32' : '192', version) }];
  })));
}

async function parsePhoto(request: Request) {
  const type = request.headers.get('content-type') ?? '';
  if (!type.startsWith('multipart/form-data;')) throw new AppError('Choose a PNG, JPEG, WebP or AVIF image.', 415);
  let file: FormDataEntryValue | null;
  try {
    const body = await limitedBody(request, maxUpload + 16_000);
    file = (await new Response(new Uint8Array(body), { headers: { 'Content-Type': type } }).formData()).get('file');
  } catch (error) {
    if (error instanceof BodyLimitError) throw new AppError('Choose a picture under 3 MB.', 413);
    throw new AppError('The image upload could not be read.', 400);
  }
  if (!(file instanceof File) || !['image/png', 'image/jpeg', 'image/webp', 'image/avif'].includes(file.type) || !file.size || file.size > maxUpload) {
    throw new AppError('Choose a PNG, JPEG, WebP or AVIF image under 3 MB.', 400);
  }
  return Buffer.from(await file.arrayBuffer());
}

async function prepare(kind: BrandIconKind, source: Buffer) {
  try {
    const image = sharp(source, { limitInputPixels: 16_000_000, failOn: 'error' }).rotate();
    const metadata = await image.metadata();
    if (!['png', 'jpeg', 'webp', 'heif'].includes(metadata.format ?? '')) throw new Error('Unsupported image');
    const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
    return Object.fromEntries(await Promise.all(sizes(kind).map(async size => {
      const pixels = size === 'maskable' ? 348 : Number(size);
      const base = await image.clone().resize(pixels, pixels, { fit: 'contain', background: transparent }).png({ palette: true, colours: 256 }).toBuffer();
      const output = size === 'maskable' ? await sharp({ create: { width: 512, height: 512, channels: 4, background: '#f4f5f7' } })
        .composite([{ input: base, gravity: 'center' }]).png({ palette: true, colours: 256 }).toBuffer() : base;
      return [size, output.toString('base64')];
    })));
  } catch {
    throw new AppError('This picture could not be opened. Try another file.', 400);
  }
}

export async function saveBrandIcon(kind: BrandIconKind, request?: Request) {
  const version = request ? randomUUID() : undefined;
  if (request && version) await setRecord(storage, version, await prepare(kind, await parsePhoto(request)));
  let previous: string | undefined;
  try {
    await mutateRecord<BrandIcon>(registry, kind, {}, current => {
      previous = current.version;
      return version ? { version } : {};
    });
  } catch (error) {
    if (version) await deleteRecord(storage, version).catch(() => {});
    throw error;
  }
  if (previous && previous !== version) await deleteRecord(storage, previous).catch(() => {});
  return brandIconSummary();
}

export async function serveBrandIcon(request: Request, asset: string) {
  const match = /^(favicon|cms|member)-(32|180|192|512|maskable)\.png$/u.exec(asset);
  if (!match) return new Response(null, { status: 404 });
  const kind = match[1] as BrandIconKind, size = match[2] as Size;
  if (!sizes(kind).includes(size)) return new Response(null, { status: 404 });
  const version = await brandIconVersion(kind);
  const fallback = () => new Response(null, { status: 302, headers: { Location: '/workspace-app/' + asset, 'Cache-Control': 'no-cache' } });
  if (!version) return fallback();
  const etag = '"' + version + '-' + size + '"';
  const headers = { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=120, must-revalidate', ETag: etag, 'X-Content-Type-Options': 'nosniff' };
  if (request.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers });
  const files = await getRecord<Partial<Record<Size, string>>>(storage, version);
  const encoded = files?.[size];
  return encoded ? new Response(new Uint8Array(Buffer.from(encoded, 'base64')), { headers }) : fallback();
}
