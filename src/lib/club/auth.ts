import 'server-only';
import { randomBytes, randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { AppError, deleteRecord, getRecord, setRecord } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { digest, hashPassword, verifyPassword } from '@/lib/security';
import { accessDenied, accountActor, assertTeam, clubDirectory, updateDirectory, type ClubAccount } from './data';
import type { ClubActor, ClubInvite } from './model';
import type { z } from 'zod';
import type { invitationInput } from './validation';
import { disconnectWorkspacePush } from '@/lib/workspace-push/devices';

const sessionCookie = 'ws_club_session';
const sessions = 'club-sessions';
const inviteTokenPattern = /^([a-f0-9-]{36})\.([A-Za-z0-9_-]{43})$/;
const secretPattern = /^[A-Za-z0-9_-]{43}$/;
const sessionAge = 60 * 60 * 24 * 7;
const dummyHash = 'scrypt:v1:club-login-dummy-salt:' + Buffer.alloc(64).toString('base64url');

type Session = { personId: string; version: string; expiresAt: string };

function cmsActor(): ClubActor {
  return { id: 'cms-owner', name: 'CMS', owner: true, role: 'admin', teamIds: [] };
}

async function startSession(account: ClubAccount) {
  await disconnectWorkspacePush('member', account.id).catch(() => {});
  const token = randomBytes(32).toString('base64url');
  const jar = await cookies();
  const previous = jar.get(sessionCookie)?.value;
  if (previous && secretPattern.test(previous)) await deleteRecord(sessions, digest(previous));
  await setRecord(sessions, digest(token), {
    personId: account.id, version: account.sessionVersion, expiresAt: new Date(Date.now() + sessionAge * 1000).toISOString(),
  } satisfies Session);
  jar.set(sessionCookie, token, { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: sessionAge });
}

export async function clubSession(): Promise<ClubActor | null> {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token || !secretPattern.test(token)) return null;
  const session = await getRecord<Session>(sessions, digest(token));
  if (!session || Date.parse(session.expiresAt) <= Date.now()) return null;
  const directory = await clubDirectory();
  const person = directory.people.find(value => value.id === session.personId && value.status === 'active');
  return person?.sessionVersion === session.version ? accountActor(person, directory.teams) : null;
}

export async function apiClubActor(request: Request, membersOnly = false) {
  if (!membersOnly && (request.headers.get('x-club-workspace') === 'cms' || request.method === 'GET' && new URL(request.url).searchParams.get('scope') === 'cms')) {
    if ((await getSession())?.role === 'owner') return cmsActor();
    throw new AppError('Sign in to the CMS first.', 401);
  }
  const actor = await clubSession();
  if (actor) return actor;
  if (!membersOnly && (await getSession())?.role === 'owner') return cmsActor();
  throw new AppError('Sign in to your club account.', 401);
}

export async function loginToClub(email: string, password: string) {
  const { people } = await clubDirectory();
  const account = people.find(person => person.email === email && person.status === 'active');
  const valid = await verifyPassword(password, account?.hash ?? dummyHash);
  if (!account || !valid) throw new AppError('Email or password is incorrect.', 401);
  await startSession(account);
}

export async function logoutFromClub() {
  const jar = await cookies();
  const token = jar.get(sessionCookie)?.value;
  if (token && secretPattern.test(token)) await deleteRecord(sessions, digest(token));
  await disconnectWorkspacePush('member').catch(() => {});
  jar.delete(sessionCookie);
}

export function clubInviteSummary(account: ClubAccount): ClubInvite | undefined {
  if (!account.invitation || account.status !== 'invited') return undefined;
  return { id: account.id, name: account.name, email: account.email, role: account.role, expiresAt: account.invitation.expiresAt };
}

function assertAdmin(actor: ClubActor, people: ClubAccount[]) {
  if (actor.owner) return;
  if (!people.some(person => person.id === actor.id && person.status === 'active' && person.role === 'admin')) accessDenied();
}

export async function issueClubInvite(actor: ClubActor, input: z.infer<typeof invitationInput>) {
  const secret = randomBytes(32).toString('base64url');
  const newId = randomUUID();
  const expiresAt = new Date(Date.now() + 5 * 86400_000).toISOString();
  const sessionVersion = randomUUID();
  const directory = await updateDirectory(value => {
    assertAdmin(actor, value.people);
    input.teamIds.forEach(id => assertTeam(value, id));
    const previous = value.people.find(person => person.email === input.email);
    if (previous?.hash) throw new AppError('An account already exists for this email.', 409);
    if (!previous && value.people.length >= 800) throw new AppError('The club directory has reached its capacity.', 409);
    const person: ClubAccount = {
      id: previous?.id ?? newId, revision: (previous?.revision ?? 0) + 1,
      name: input.name, email: input.email, role: input.role, status: 'invited', teamIds: input.teamIds,
      position: previous?.position ?? '', jersey: previous?.jersey ?? null, bio: previous?.bio ?? '', avatar: previous?.avatar ?? false,
      sessionVersion, invitation: { hash: digest(secret), expiresAt },
    };
    return { ...value, people: previous ? value.people.map(item => item.id === person.id ? person : item) : [...value.people, person] };
  });
  const person = directory.people.find(item => item.email === input.email)!;
  return { invite: clubInviteSummary(person)!, token: person.id + '.' + secret };
}

export async function revokeClubInvite(actor: ClubActor, id: string) {
  await updateDirectory(value => {
    assertAdmin(actor, value.people);
    if (!value.people.some(person => person.id === id && person.status === 'invited' && person.invitation)) throw new AppError('This invitation is unavailable.', 404);
    return { ...value, people: value.people.map(person => person.id === id ? { ...person, invitation: undefined, status: 'disabled', revision: person.revision + 1 } : person) };
  });
}

function invitationValid(person: ClubAccount | undefined, hash: string): person is ClubAccount {
  return person?.status === 'invited' && person.invitation?.hash === hash && Date.parse(person.invitation.expiresAt) > Date.now();
}

export async function acceptClubInvite(token: string, password: string) {
  const match = inviteTokenPattern.exec(token);
  if (!match) throw new AppError('This invitation is expired or has already been used.', 404);
  const id = match[1], inviteHash = digest(match[2]);
  const current = (await clubDirectory()).people.find(person => person.id === id);
  if (!invitationValid(current, inviteHash)) throw new AppError('This invitation is expired or has already been used.', 404);
  const hash = await hashPassword(password);
  const version = randomUUID();
  const directory = await updateDirectory(value => {
    const person = value.people.find(item => item.id === id);
    if (!invitationValid(person, inviteHash)) throw new AppError('This invitation is expired or has already been used.', 404);
    return { ...value, people: value.people.map(item => item.id === id
      ? { ...item, status: 'active', hash, invitation: undefined, sessionVersion: version, revision: item.revision + 1 }
      : item) };
  });
  await startSession(directory.people.find(person => person.id === id)!);
}

export function ownerClubActor() {
  return cmsActor();
}
