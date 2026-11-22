import 'server-only';
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';
import { AppError, getSettings } from '@/lib/db';
import { digest, hashPassword, verifyPassword } from '@/lib/security';
import { sendReservationMail } from '@/lib/mail';
import { read, list, change, save, remove, portalConfigured } from './store';
import type { Access, ActorView, Language, PortalRole } from './model';

export type Person = Access & { epoch: string; hash: string | null; invitation: { hash: string; expires: number } | null };
type Session = { id: string; epoch: string; expires: number };
const bucket = 'accounts', sessionBucket = 'sessions';
const cookieName = 'ws_coaching_portal';
const sessionAge = 14 * 86400;
const tokenPattern = /^[a-zA-Z0-9_-]{43}$/u;
const fakeHash = 'scrypt:v1:coaching-portal-placeholder:' + Buffer.alloc(64).toString('base64url');
const emailId = (value: string) => digest(value.trim().toLowerCase());
export function publicPerson({ id, name, email, role, language, status, coaches, created }: Person): Access {
  return { id, name, email, role, language, status, coaches, created };
}
export async function personById(id: string) {
  return await read<Person>(bucket, id);
}
export async function directory() {
  return (await list<Person>(bucket, 1000)).sort((a, b) => a.name.localeCompare(b.name));
}
export async function currentActor(): Promise<ActorView | null> {
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  if (token && tokenPattern.test(token) && portalConfigured()) {
    const data = await read<Session>(sessionBucket, digest(token));
    if (data && data.expires > Date.now()) {
      const person = await personById(data.id);
      if (person?.status === 'active' && person.epoch === data.epoch) {
        return { id: person.id, name: person.name, role: person.role, language: person.language };
      }
    }
  }
  const cms = await getSession();
  return cms?.role === 'owner' ? { id: 'cms-owner', name: cms.name || 'Sebastian', role: 'owner', language: 'de' } : null;
}
export async function actorRequired() {
  const actor = await currentActor();
  if (!actor) throw new AppError('Bitte melde dich im Coaching-Portal an.', 401);
  return actor;
}
export function ownerOnly(actor: ActorView) {
  if (actor.role !== 'owner') throw new AppError('Diese Einstellung verwaltet Sebastian.', 403);
}
export function staffOnly(actor: ActorView) {
  if (actor.role === 'client') throw new AppError('Diese Ansicht ist für das Coaching-Team.', 403);
}
export function canOpen(actor: ActorView, person: Person) {
  return person.role === 'client' && (actor.role === 'owner' || (person.status !== 'paused' && (
    (actor.role === 'coach' && person.coaches.includes(actor.id)) || (actor.role === 'client' && actor.id === person.id))));
}
export async function clientRequired(actor: ActorView, id: string | null | undefined) {
  const key = actor.role === 'client' ? actor.id : id;
  if (!key || !/^[a-f0-9]{64}$/u.test(key)) throw new AppError('Wähle einen Kunden aus.', 400);
  if (actor.role === 'client' && id && id !== actor.id) throw new AppError('Diese Coaching-Ansicht ist nicht verfügbar.', 404);
  const person = await personById(key);
  if (!person || !canOpen(actor, person)) throw new AppError('Diese Coaching-Ansicht ist nicht verfügbar.', 404);
  return person;
}
async function beginSession(person: Person) {
  const jar = await cookies();
  const previous = jar.get(cookieName)?.value;
  if (previous && tokenPattern.test(previous)) await remove(sessionBucket, digest(previous));
  const token = randomBytes(32).toString('base64url');
  await save<Session>(sessionBucket, digest(token), { id: person.id, epoch: person.epoch, expires: Date.now() + sessionAge * 1000 });
  jar.set(cookieName, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: sessionAge });
}
export async function signIn(email: string, password: string) {
  const person = await personById(emailId(email));
  const valid = await verifyPassword(password, person?.hash || fakeHash);
  if (!valid || !person || person.status !== 'active') throw new AppError('Anmeldung nicht möglich. Prüfe E-Mail und Passwort.', 401);
  await beginSession(person);
}
export async function signOut() {
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  if (token && tokenPattern.test(token)) await remove(sessionBucket, digest(token));
  jar.delete(cookieName);
}

async function invitationLink(id: string, token: string, person: Person, send: boolean) {
  const { siteUrl } = await getSettings();
  const link = new URL('/portal', siteUrl);
  link.hash = 'invite=' + id + '.' + token;
  let delivery: 'copy' | 'sent' | 'failed' = 'copy';
  if (send) {
    const english = person.language === 'en';
    try {
      await sendReservationMail({
        to: person.email, subject: english ? 'Your Sebastian Coaching invitation' : 'Deine Einladung zu Sebastian Coaching',
        text: (english ? 'Set up your personal access to Sebastian Coaching.' : 'Richte deinen persönlichen Zugang zu Sebastian Coaching ein.') + '\n\n' + link.href
      });
      delivery = 'sent';
    } catch { delivery = 'failed'; }
  }
  return { link: link.href, person: publicPerson(person), delivery };
}
export async function invite(actor: ActorView, input: { name: string; email: string; role: PortalRole; language: Language; send: boolean }) {
  staffOnly(actor);
  if (input.role === 'coach') ownerOnly(actor);
  const id = emailId(input.email), token = randomBytes(32).toString('base64url');
  const now = Date.now();
  const created = await change<Person | null>(bucket, id, null, current => {
    if (current) throw new AppError('Für diese E-Mail-Adresse besteht bereits ein Zugang.', 409);
    return { id, name: input.name, email: input.email, role: input.role, language: input.language,
      status: 'invited', coaches: actor.role === 'coach' ? [actor.id] : [], epoch: randomUUID(), hash: null,
      invitation: { hash: digest(token), expires: now + 72 * 3600_000 }, created: new Date(now).toISOString() };
  });
  return invitationLink(id, token, created!, input.send);
}
export async function renewInvite(actor: ActorView, id: string, send: boolean) {
  ownerOnly(actor);
  const token = randomBytes(32).toString('base64url');
  const invitation = { hash: digest(token), expires: Date.now() + 72 * 3600_000 };
  const epoch = randomUUID();
  const updated = await change<Person | null>(bucket, id, null, person => {
    if (!person) throw new AppError('Zugang nicht gefunden.', 404);
    return { ...person, status: 'invited', invitation, epoch };
  });
  return invitationLink(id, token, updated!, send);
}
export async function acceptInvite(id: string, token: string, password: string) {
  const hash = await hashPassword(password), epoch = randomUUID();
  const approved = await change<Person | null>(bucket, id, null, person => {
    const invitation = person?.invitation;
    if (!person || !invitation || person.status !== 'invited' || invitation.expires < Date.now() ||
      !timingSafeEqual(Buffer.from(invitation.hash, 'hex'), Buffer.from(digest(token), 'hex'))) {
      throw new AppError('Diese Einladung ist abgelaufen oder wurde bereits verwendet.', 410);
    }
    return { ...person, status: 'active', invitation: null, hash, epoch };
  });
  await beginSession(approved!);
}
export async function setAssignments(actor: ActorView, id: string, coachIds: string[]) {
  ownerOnly(actor);
  const coaches = [...new Set(coachIds)];
  for (const coachId of coaches) {
    const coach = await personById(coachId);
    if (coach?.role !== 'coach' || coach.status === 'paused') throw new AppError('Wähle einen verfügbaren Betreuer.');
  }
  return change<Person | null>(bucket, id, null, person => {
    if (!person || person.role !== 'client') throw new AppError('Kundenprofil nicht gefunden.', 404);
    return { ...person, coaches };
  });
}
export async function setPaused(actor: ActorView, id: string, paused: boolean) {
  ownerOnly(actor);
  const epoch = randomUUID();
  return change<Person | null>(bucket, id, null, person => {
    if (!person) throw new AppError('Zugang nicht gefunden.', 404);
    if (!paused && !person.hash) throw new AppError('Erstelle eine Einladung für diesen Zugang.', 409);
    return { ...person, status: paused ? 'paused' : 'active', epoch, invitation: null };
  });
}
