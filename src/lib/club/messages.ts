import 'server-only';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { AppError, getRecord, listClubMessageRows, mutateRecord, setRecord } from '@/lib/db';
import { CLUB_ROLES, type ClubActor, type ClubRole } from './model';
import type { ClubAudience, ClubMessage, ClubMessageChoices, ClubMessagePage } from './messages-model';
import { accessDenied, accountActor, activeTeam, canManageTeam, canReadClubPerson, clubDirectory, clubManager, clubWide, type ClubDirectory } from './data';
import { clubId } from './validation';

const collection = 'club-messages';
const office = 'cms-owner';
const audienceSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('person'), id: z.union([clubId, z.literal(office)]) }),
  z.strictObject({ kind: z.literal('team'), id: clubId }),
  z.strictObject({ kind: z.literal('role'), role: z.enum(CLUB_ROLES) }),
  z.strictObject({ kind: z.literal('club') }),
]);
export const newClubMessage = z.strictObject({
  subject: z.string().trim().min(1).max(120), body: z.string().trim().min(1).max(5000), audience: audienceSchema,
  replyTo: clubId.optional(),
});
export const clubMessageRead = z.strictObject({ read: z.boolean() });

type Locale = 'de' | 'en';
type Entry = {
  id: string; senderId: string; senderName: string; audience: ClubAudience; label: string;
  subject: string; body: string; createdAt: string; recipientIds: string[]; replyTo?: string;
};
type ReadState = Record<string, true>;
const officeName = (locale: Locale) => locale === 'de' ? 'Vereinsbüro' : 'Club office';
const roleNames: Record<ClubRole, Record<Locale, string>> = {
  member: { de: 'Alle Mitglieder', en: 'All members' }, coach: { de: 'Alle Trainer', en: 'All coaches' },
  board: { de: 'Gesamter Vorstand', en: 'All board members' }, admin: { de: 'Alle Admins', en: 'All admins' },
};

function actorCanMessage(actor: ClubActor, id: string, directory: ClubDirectory) {
  if (id === actor.id) return false;
  if (id === office) return true;
  const person = directory.people.find(item => item.id === id && item.status === 'active');
  return Boolean(person && (canReadClubPerson(actor, person, directory.teams) || actor.role === 'coach' && person.role === 'coach'));
}

function choicesFor(actor: ClubActor, directory: ClubDirectory, locale: Locale): ClubMessageChoices {
  const people = directory.people.filter(person => actorCanMessage(actor, person.id, directory)).map(person => ({ id: person.id, name: person.name }));
  if (!actor.owner) people.unshift({ id: office, name: officeName(locale) });
  return {
    people,
    teams: clubManager(actor) ? directory.teams.filter(team => !team.archived && canManageTeam(actor, team.id)).map(team => ({ id: team.id, name: team.name })) : [],
    roles: clubWide(actor) ? [...CLUB_ROLES] : actor.role === 'coach' ? ['coach'] : [],
    club: clubWide(actor),
  };
}

function isVisible(entry: Entry, actor: ClubActor) {
  return entry.senderId === actor.id || entry.recipientIds.includes(actor.id);
}

function replyPartner(entry: Entry, actor: ClubActor, directory: ClubDirectory, locale: Locale) {
  const id = entry.senderId === actor.id ? entry.audience.kind === 'person' ? entry.audience.id : undefined : entry.senderId;
  if (!id || id === actor.id) return undefined;
  if (id === office) return { id, name: officeName(locale) };
  const person = directory.people.find(item => item.id === id && item.status === 'active');
  return person && { id, name: person.name };
}

function project(entry: Entry, actor: ClubActor, directory: ClubDirectory, read: ReadState, locale: Locale): ClubMessage {
  const sent = entry.senderId === actor.id;
  const audienceLabel = entry.audience.kind === 'club' ? locale === 'de' ? 'Gesamter Verein' : 'Whole club'
    : entry.audience.kind === 'role' ? roleNames[entry.audience.role][locale]
    : entry.audience.kind === 'person' && entry.audience.id === office ? officeName(locale) : entry.label;
  return {
    id: entry.id, senderId: entry.senderId, senderName: entry.senderId === office ? officeName(locale) : entry.senderName,
    audienceLabel, subject: entry.subject, body: entry.body, createdAt: entry.createdAt, read: sent || Boolean(read[entry.id]), sent,
    ...(entry.replyTo ? { replyTo: entry.replyTo } : {}),
    ...(sent ? { recipientCount: entry.recipientIds.length } : {}),
    replyToPerson: replyPartner(entry, actor, directory, locale),
  };
}

export function clubNotificationRecipients(directory: ClubDirectory, teamId?: string | null) {
  return directory.people.filter(person => person.status === 'active' && (!teamId || accountActor(person, directory.teams).teamIds.includes(teamId))).map(person => person.id);
}

function recipients(actor: ClubActor, directory: ClubDirectory, audience: ClubAudience, reply: boolean) {
  if (audience.kind === 'person') {
    if (!reply && !actorCanMessage(actor, audience.id, directory)) accessDenied();
    if (audience.id === office) return { ids: [office], label: 'Club office' };
    const person = directory.people.find(item => item.id === audience.id && item.status === 'active');
    if (!person || person.id === actor.id) accessDenied();
    return { ids: [person.id], label: person.name };
  }
  if (audience.kind === 'team') {
    const team = activeTeam(directory, audience.id);
    if (!team || !canManageTeam(actor, team.id)) accessDenied();
    return { ids: clubNotificationRecipients(directory, team.id), label: team.name };
  }
  if (audience.kind === 'role') {
    if (!clubWide(actor) && !(actor.role === 'coach' && audience.role === 'coach')) accessDenied();
    return { ids: directory.people.filter(person => person.status === 'active' && person.role === audience.role).map(person => person.id), label: '' };
  }
  if (!clubWide(actor)) accessDenied();
  return { ids: clubNotificationRecipients(directory), label: '' };
}

export async function clubMessagePage(actor: ClubActor, tab: 'inbox' | 'sent', before: string | undefined, locale: Locale): Promise<ClubMessagePage> {
  const [directory, read, cursor] = await Promise.all([
    clubDirectory(), getRecord<ReadState>('club-message-read', actor.id),
    before ? getRecord<Entry>(collection, clubId.parse(before)) : null,
  ]);
  if (before && (!cursor || !isVisible(cursor, actor) || (tab === 'sent') !== (cursor.senderId === actor.id))) throw new AppError('This message is unavailable.', 404);
  const records = await listClubMessageRows<Entry>(actor.id, tab, cursor ?? undefined);
  const messages = records.slice(0, 36).map(entry => project(entry, actor, directory, read ?? {}, locale));
  return { messages, choices: choicesFor(actor, directory, locale), nextBefore: records.length > 36 ? messages.at(-1)?.id : undefined };
}

export async function sendClubMessage(actor: ClubActor, input: z.infer<typeof newClubMessage>, locale: Locale) {
  const directory = await clubDirectory();
  const parent = input.replyTo ? await getRecord<Entry>(collection, input.replyTo) : null;
  if (input.replyTo && (!parent || !isVisible(parent, actor) || input.audience.kind !== 'person'
    || replyPartner(parent, actor, directory, locale)?.id !== input.audience.id)) throw new AppError('This conversation is unavailable.', 404);
  const target = recipients(actor, directory, input.audience, Boolean(parent));
  const recipientIds = [...new Set(target.ids)].filter(id => id !== actor.id);
  if (!recipientIds.length) throw new AppError('There are no active recipients in this group.', 400);
  const entry: Entry = {
    id: randomUUID(), senderId: actor.id, senderName: actor.name, createdAt: new Date().toISOString(),
    audience: input.audience, subject: input.subject, body: input.body, label: target.label, recipientIds,
    ...(input.replyTo ? { replyTo: input.replyTo } : {}),
  };
  await setRecord(collection, entry.id, entry);
  return { message: project(entry, actor, directory, {}, locale), recipientIds };
}

export async function setClubMessageRead(actor: ClubActor, id: string, read: boolean) {
  const entry = await getRecord<Entry>(collection, id);
  if (!entry?.recipientIds.includes(actor.id)) throw new AppError('This message is unavailable.', 404);
  await mutateRecord<ReadState>('club-message-read', actor.id, {}, current => {
    const next = { ...current };
    if (read) next[id] = true;
    else delete next[id];
    return next;
  });
}
