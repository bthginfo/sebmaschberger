import 'server-only';
import { randomBytes, randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';
import { AppError, deleteRecord, getRecord, guardedMutateRecord, listRecords, setRecord, updateExistingRecord, type ModuleGuard } from '@/lib/db';
import { digest } from '@/lib/security';
import { requireCoachStudioEnabled } from './enabled';
import type { CoachLink, CoachPlay, CoachRecord } from './model';

const collection = 'coach-plays';
const idPattern = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/;
const secretPattern = /^[a-zA-Z0-9_-]{43}$/;
const millisecondsPerDay = 86_400_000;
type PrivateLink = CoachLink & { hash: string };
type StoredPlay = { record: CoachRecord; links: PrivateLink[]; ownerId?: string };
type Stored = StoredPlay | { deletedAt: string };
type Actor = { kind: 'owner' } | { kind: 'guest'; secret: string };

export class CoachConflict extends Error {
  constructor(readonly record: CoachRecord) {
    super('conflict');
  }
}

export function coachCookieName(id: string) {
  return `ws_coach_${id}`;
}

function notFound(): never {
  throw new AppError('Diese Taktik oder Freigabe ist nicht verfügbar.', 404);
}

function publicLink({ hash: _hash, ...link }: PrivateLink): CoachLink {
  return link;
}

function usableLink(stored: StoredPlay, secret: string) {
  if (!secretPattern.test(secret)) return undefined;
  const hash = digest(secret);
  const now = Date.now();
  return stored.links.find(link => link.hash === hash && !link.revokedAt && Date.parse(link.expiresAt) > now);
}

function requireGrant(stored: StoredPlay, actor: Actor, edit: boolean) {
  if (actor.kind === 'owner') return;
  const link = usableLink(stored, actor.secret);
  if (!link) notFound();
  if (edit && link.role !== 'edit') throw new AppError('Dieser Link erlaubt nur das Ansehen.', 403);
}

async function readPlay(id: string) {
  if (!idPattern.test(id)) return null;
  const stored = await getRecord<Stored>(collection, id);
  return stored && 'record' in stored ? stored : null;
}

async function guestSecret(id: string) {
  return idPattern.test(id) ? (await cookies()).get(coachCookieName(id))?.value ?? '' : '';
}

async function currentActor(id: string): Promise<Actor> {
  const session = await getSession();
  if (session?.role === 'owner') return { kind: 'owner' };
  return { kind: 'guest', secret: await guestSecret(id) };
}

export async function listCoachPlays(): Promise<CoachRecord[]> {
  const values = await listRecords<Stored>(collection);
  return values.flatMap(value => 'record' in value ? [value.record] : [])
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function createCoachPlay(play: CoachPlay, ownerId?: string): Promise<CoachRecord> {
  const record = { id: randomUUID(), revision: 1, updatedAt: new Date().toISOString(), play };
  await setRecord(collection, record.id, { record, links: [], ...(ownerId ? { ownerId } : {}) } satisfies StoredPlay);
  return record;
}

export async function listClubCoachEntries() {
  return (await listRecords<Stored>(collection)).flatMap(value => 'record' in value ? [{ record: value.record, ownerId: value.ownerId }] : [])
    .sort((a, b) => b.record.updatedAt.localeCompare(a.record.updatedAt));
}

export async function getClubCoachEntry(id: string) {
  const play = await readPlay(id);
  return play && { record: play.record, ownerId: play.ownerId };
}

export async function saveClubCoachRecord(id: string, play: CoachPlay, revision: number, guard?: ModuleGuard) {
  function save(stored: Stored): StoredPlay {
    if (!('record' in stored)) notFound();
    if (stored.record.revision !== revision) throw new CoachConflict(stored.record);
    return { ...stored, record: { id, play, revision: revision + 1, updatedAt: new Date().toISOString() } };
  }
  const result = guard
    ? await guardedMutateRecord<Stored>(collection, id, { deletedAt: 'missing' }, save, guard)
    : await updateExistingRecord<Stored>(collection, id, save);
  if (!result || !('record' in result)) notFound();
  return result.record;
}

export async function getOwnerCoachPlay(id: string) {
  return (await readPlay(id))?.record ?? null;
}

export async function getGuestCoachPlay(id: string, edit: boolean) {
  const secret = await guestSecret(id);
  if (!secret) return null;
  const stored = await readPlay(id);
  const link = stored && usableLink(stored, secret);
  return stored && link && (!edit || link.role === 'edit') ? stored.record : null;
}

export async function getAuthorizedCoachPlay(id: string) {
  const actor = await currentActor(id);
  if (actor.kind === 'guest' && !actor.secret) notFound();
  const stored = await readPlay(id);
  if (!stored) notFound();
  requireGrant(stored, actor, false);
  return stored.record;
}

export async function saveCoachPlay(id: string, play: CoachPlay, revision: number) {
  const actor = await currentActor(id);
  if (!idPattern.test(id) || (actor.kind === 'guest' && !actor.secret)) notFound();
  const result = await updateExistingRecord<Stored>(collection, id, stored => {
    if (!('record' in stored)) notFound();
    // Checking both in the same CAS prevents a concurrent revocation or save from being overwritten.
    requireGrant(stored, actor, true);
    if (stored.record.revision !== revision) throw new CoachConflict(stored.record);
    return {
      ...stored,
      record: { id, play, revision: revision + 1, updatedAt: new Date().toISOString() },
    };
  });
  if (!result || !('record' in result)) notFound();
  return result.record;
}

export async function removeCoachPlay(id: string, revision: number) {
  if (!idPattern.test(id)) notFound();
  const removed = await updateExistingRecord<Stored>(collection, id, stored => {
    if (!('record' in stored)) return stored;
    if (stored.record.revision !== revision) throw new CoachConflict(stored.record);
    // Strip the board and permissions atomically before clearing the key.
    return { deletedAt: new Date().toISOString() };
  });
  if (removed) await deleteRecord(collection, id);
}

export async function listCoachLinks(id: string) {
  const stored = await readPlay(id);
  if (!stored) notFound();
  return stored.links.map(publicLink);
}

export async function createCoachLink(id: string, role: CoachLink['role'], name: string, days: number) {
  if (!idPattern.test(id)) notFound();
  const secret = randomBytes(32).toString('base64url');
  const now = Date.now();
  const link: PrivateLink = {
    id: randomUUID(), role, name, hash: digest(secret),
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + days * millisecondsPerDay).toISOString(),
  };
  const result = await updateExistingRecord<Stored>(collection, id, stored => {
    if (!('record' in stored)) notFound();
    const active = stored.links.filter(value => !value.revokedAt && Date.parse(value.expiresAt) > now);
    if (active.length >= 30) throw new AppError('Es sind 30 Links aktiv. Widerrufe zuerst einen vorhandenen Link.', 409);
    const inactive = stored.links.filter(value => !active.includes(value)).slice(0, 20);
    return { ...stored, links: [link, ...active, ...inactive] };
  });
  if (!result) notFound();
  return { link: publicLink(link), url: `/coach/access#${id}.${secret}` };
}

export async function revokeCoachLink(id: string, linkId: string) {
  if (!idPattern.test(id)) notFound();
  const result = await updateExistingRecord<Stored>(collection, id, stored => {
    if (!('record' in stored) || !stored.links.some(link => link.id === linkId)) notFound();
    return {
      ...stored,
      links: stored.links.map(link => link.id === linkId && !link.revokedAt
        ? { ...link, revokedAt: new Date().toISOString() }
        : link),
    };
  });
  if (!result) notFound();
}

export async function redeemCoachLink(token: string) {
  await requireCoachStudioEnabled();
  const [id, secret, extra] = token.split('.');
  if (!id || !secret || extra !== undefined || !secretPattern.test(secret)) notFound();
  const stored = await readPlay(id);
  const link = stored && usableLink(stored, secret);
  if (!link) notFound();
  const seconds = Math.max(1, Math.ceil((Date.parse(link.expiresAt) - Date.now()) / 1000));
  return { id, secret, seconds, path: `/coach/${link.role === 'edit' ? 'edit' : 'view'}/${id}` };
}
