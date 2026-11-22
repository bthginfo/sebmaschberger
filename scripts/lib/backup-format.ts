import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from 'node:crypto';
import { z } from 'zod';
import { websiteSchema } from '../../src/lib/validation';

const magic = Buffer.from('WSBACKUP1\n');
export const archiveLimit = 96 * 1024 * 1024;
export const fileLimit = 12 * 1024 * 1024;
const timestamp = z.string().datetime();
const sha = z.string().regex(/^[a-f0-9]{64}$/);
const fileSchema = z.object({
  url: z.string().min(1).max(1500), visibility: z.enum(['public','private']),
  extension: z.enum(['svg','png','webp','jpg','gif','avif','pdf','zip']),
  sha, bytes: z.string().min(4).max(Math.ceil(fileLimit / 3) * 4)
}).strict();
const snapshotSchema = z.object({
  state: z.object({
    draft: websiteSchema, published: websiteSchema, revision: z.number().int().positive(),
    updatedAt: timestamp, publishedAt: timestamp.nullable(),
    revisions: z.array(z.object({ id: z.string().min(1), label: z.string().max(500), createdAt: timestamp, content: websiteSchema })).max(30)
  }),
  records: z.record(z.string().min(1).max(350), z.unknown())
});
const archiveSchema = z.object({
  version: z.literal(1), createdAt: timestamp, commit: z.string().regex(/^[a-f0-9]{40}$/),
  project: z.string().min(1).max(200), snapshot: snapshotSchema, files: z.array(fileSchema).max(3000)
}).strict();
export type BackupArchive = z.infer<typeof archiveSchema>;
export type BackupSnapshot = { state: BackupArchive['snapshot']['state']; records: Record<string,Record<string,unknown>> };
export type BackupFile = BackupArchive['files'][number];
export const backedUpCollections = ['settings','media','inquiries','reservations-by-date','commerce','commerce-assets','business-documents','business-designs','commerce-documents'];
export const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

export function safeBackupSnapshot(value: unknown): BackupSnapshot {
  const snapshot = snapshotSchema.parse(value);
  const records: BackupSnapshot['records'] = {};
  for (const [key, original] of Object.entries(snapshot.records)) {
    const colon = key.indexOf(':');
    if (!backedUpCollections.includes(key.slice(0, colon)) || colon < 1 || colon === key.length - 1) continue;
    if (key.startsWith('reservations-by-date:')) {
      const source = Array.isArray(original) ? original : z.object({ bookings: z.array(z.unknown()) }).parse(original).bookings;
      const bookings = z.array(z.record(z.string(), z.unknown())).parse(source);
      records[key] = { bookings: bookings.map(booking => {
        const delivery = booking.delivery as { status?: string; at?: string } | undefined;
        return delivery?.status === 'sending' ? { ...booking, delivery: { ...delivery, status: 'failed' } } : booking;
      }) };
      continue;
    }
    const entry = { ...z.record(z.string(),z.unknown()).parse(original) };
    if (key.startsWith('settings:')) {
      if (key !== 'settings:site') continue;
      entry.smtp = { enabled: false, host: '', port: 465, secure: true, user: '', from: '', to: '', password: '' };
    }
    if (key.startsWith('inquiries:')) {
      delete entry.receiptLease;
      delete entry.submissionHash;
      const proposal = entry.proposal;
      if (proposal && typeof proposal === 'object') {
        const { tokenHash: _token, ...view } = proposal as Record<string, unknown>;
        entry.proposal = { ...view, ...(view.status === 'offered' ? { status: 'revoked' } : {}) };
      }
    }
    if (key.startsWith('commerce:')) {
      if (key !== 'commerce:state' || !Array.isArray(entry.orders)) continue;
      entry.orders = entry.orders.map(order => {
        const { checkoutUrl: _url, checkoutRequest: _request, requestKey: _key, requestDigest: _digest,
          checkoutFirstAttempt: _attempt, ...saved } = order;
        const { leaseUntil: _until, leaseId: _lease, ...mail } = saved.mail || {};
        return { ...saved, requestKey: '', requestDigest: '', mail: { ...mail, ...(mail.status === 'sending' ? { status: 'failed' } : {}) } };
      });
    }
    records[key] = entry;
  }
  return { state: snapshot.state, records };
}

function keyFor(passphrase: string, salt: Uint8Array) {
  if (passphrase.length < 16 || passphrase.length > 512) throw new Error('Die Sicherung benötigt eine Passphrase mit 16 bis 512 Zeichen.');
  return scryptSync(passphrase, salt, 32, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
}

export function sealArchive(archive: BackupArchive, passphrase: string) {
  const bytes = Buffer.from(JSON.stringify(archiveSchema.parse(archive)));
  if (bytes.length > archiveLimit) throw new Error('Die Sicherung überschreitet das Archivlimit von 96 MB.');
  const salt = randomBytes(16), iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyFor(passphrase, salt), iv);
  cipher.setAAD(magic);
  const encrypted = Buffer.concat([cipher.update(bytes), cipher.final()]);
  return Buffer.concat([magic, salt, iv, cipher.getAuthTag(), encrypted]);
}

export function openArchive(encrypted: Buffer, passphrase: string): BackupArchive {
  if (encrypted.length <= magic.length + 44 || encrypted.length > archiveLimit + magic.length + 44 ||
      !encrypted.subarray(0,magic.length).equals(magic)) throw new Error('Diese Datei ist keine unterstützte Website-Sicherung.');
  const offset = magic.length;
  let bytes: Buffer;
  try {
    const decipher = createDecipheriv('aes-256-gcm', keyFor(passphrase, encrypted.subarray(offset, offset + 16)), encrypted.subarray(offset + 16, offset + 28));
    decipher.setAAD(magic); decipher.setAuthTag(encrypted.subarray(offset + 28, offset + 44));
    bytes = Buffer.concat([decipher.update(encrypted.subarray(offset + 44)), decipher.final()]);
  } catch { throw new Error('Passphrase oder Integritätsprüfung der Sicherung stimmt nicht.'); }
  const archive = archiveSchema.parse(JSON.parse(bytes.toString('utf8')));
  for (const file of archive.files) {
    const body = Buffer.from(file.bytes, 'base64');
    if (!body.length || body.length > fileLimit || sha256(body) !== file.sha) throw new Error('Eine Datei in der Sicherung ist unvollständig.');
  }
  return { ...archive, snapshot: safeBackupSnapshot(archive.snapshot) };
}

export function rebindMedia(value: unknown, locations: ReadonlyMap<string,string>): unknown {
  if (typeof value === 'string') return locations.get(value) ?? value;
  if (Array.isArray(value)) return value.map(entry => rebindMedia(entry,locations));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
    key, key === 'srcSet' && typeof entry === 'string'
      ? entry.split(',').map(source => source.trim().replace(/^\S+/, url => locations.get(url) ?? url)).join(', ')
      : rebindMedia(entry,locations)
  ]));
}
