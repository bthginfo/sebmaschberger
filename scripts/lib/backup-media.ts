import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { get, head } from '@vercel/blob';
import { validateDigitalBytes, privateCommerceUrl } from '../../src/lib/commerce/assets';
import { fileLimit, sha256, type BackupFile, type BackupSnapshot } from './backup-format';

const extensions: Record<string,BackupFile['extension']> = {
  'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/svg+xml': 'svg', 'image/avif': 'avif',
  'image/gif': 'gif', 'application/pdf': 'pdf', 'application/zip': 'zip', 'application/x-zip-compressed': 'zip'
};

async function collect(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader(), chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > fileLimit) { await reader.cancel(); throw new Error('Eine Datei überschreitet 12 MB.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}

export async function bundledBytes(root: string, url: string) {
  if (!/^\/[a-zA-Z0-9_.\/-]+$/.test(url) || url.startsWith('//') || url.split('/').includes('..')) throw new Error('Unsicherer lokaler Medienpfad.');
  const publicRoot = await realpath(path.join(root,'public'));
  const target = await realpath(path.join(publicRoot,url.slice(1)));
  const relative = path.relative(publicRoot,target);
  if (!relative || relative.startsWith('..'+path.sep) || path.isAbsolute(relative)) throw new Error('Der Medienpfad liegt außerhalb des Projekts.');
  const info = await stat(target);
  if (!info.isFile() || info.size > fileLimit) throw new Error('Die Mediendatei kann nicht gesichert werden.');
  return readFile(target);
}

async function blobBytes(url: string, visibility: BackupFile['visibility']) {
  const parsed = new URL(url);
  const isPublic = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/media\//i.test(url) &&
    !parsed.username && !parsed.password && !parsed.port && !parsed.search && !parsed.hash;
  if (!(visibility === 'private' ? privateCommerceUrl(url) : isPublic)) throw new Error('Nur Medien aus dem eigenen Blob-Speicher können gesichert werden.');
  const token = visibility === 'private' ? process.env.PRIVATE_COMMERCE_BLOB_READ_WRITE_TOKEN : process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error('Der Zugang zum eigenen Blob-Speicher fehlt.');
  const abortSignal = AbortSignal.timeout(25000);
  const pathname = decodeURIComponent(parsed.pathname.slice(1));
  const meta = await head(pathname,{token,abortSignal});
  if (meta.url !== url || meta.size > fileLimit) throw new Error('Die Datei gehört nicht zum verbundenen Speicher oder ist zu groß.');
  const result = await get(pathname,{access:visibility,token,abortSignal,useCache:false});
  if (result?.statusCode !== 200 || !result.stream || result.blob.url !== url) throw new Error('Die Datei konnte nicht vollständig gelesen werden.');
  return collect(result.stream);
}

export async function backupFiles(snapshot: BackupSnapshot, root: string, cloud: boolean) {
  const files = new Map<string,BackupFile>();
  let size = 0;
  for (const [key,data] of Object.entries(snapshot.records)) {
    if (!key.startsWith('media:') && !key.startsWith('commerce-assets:')) continue;
    const visibility = key.startsWith('commerce-assets:') ? 'private' : 'public';
    const url = String(data.url ?? '');
    if (files.has(visibility+url)) continue;
    try {
      const extension = extensions[String(visibility === 'private' ? data.contentType : data.type)];
      if (!extension || extension === 'svg' && !url.startsWith('/')) throw new Error('Dieser Dateityp braucht eine gesonderte Sicherung.');
      if (!url.startsWith('/') && !cloud) throw new Error('Für Dateien im Blob-Speicher bitte --cloud-media angeben.');
      const bytes = url.startsWith('/') && visibility === 'public' ? await bundledBytes(root,url) : await blobBytes(url,visibility);
      const sha = sha256(bytes);
      if (visibility === 'private') validateDigitalBytes(bytes,String(data.contentType));
      if (!bytes.length || (data.sha256 && data.sha256 !== sha)) throw new Error('Der Inhalt stimmt nicht mit der gespeicherten Datei überein.');
      size += bytes.length;
      if (size > 62 * 1024 * 1024) throw new Error('Die Mediendateien überschreiten das Archivlimit.');
      files.set(visibility+url,{ url,visibility,extension,sha,bytes:bytes.toString('base64') });
    } catch (error) {
      throw new Error('Eine Datei in der Medienbibliothek oder im Shop fehlt oder kann nicht gesichert werden.',{ cause: error });
    }
  }
  return [...files.values()];
}
