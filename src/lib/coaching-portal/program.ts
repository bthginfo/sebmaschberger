import 'server-only';
import { randomUUID } from 'node:crypto';
import { AppError } from '@/lib/db';
import { addDays, emptyPlan, emptyProfile, isEnabled, today, visiblePlan } from './model';
import type { Activity, ActorView, Audit, ChatMessage, Edition, LibraryItem, MetricRow, Metrics, Plan, Profile, Program, HealthSource } from './model';
import { canOpen, clientRequired, directory, publicPerson, staffOnly } from './access';
import type { Person } from './access';
import { change, list, read, remove, save } from './store';

const programBucket = 'programs', libraryBucket = 'library';
const activityBucket = (id: string) => 'activities/' + id;
const metricBucket = (id: string) => 'metrics/' + id;
const chatBucket = (id: string) => 'chat/' + id;
const auditBucket = (id: string) => 'audit/' + id;
const privateSettings = 'client-settings';

export function initialProgram(): Program {
  return { revision: 0, draft: emptyPlan(), published: null, history: [], profile: structuredClone(emptyProfile) };
}
export async function getProgram(id: string) {
  return await read<Program>(programBucket, id) ?? initialProgram();
}
function atNow() { return new Date().toISOString(); }
export async function audit(actor: ActorView, id: string, title: string) {
  const record: Audit = { id: randomUUID(), at: atNow(), actor: actor.name, title };
  await save(auditBucket(id), record.id, record);
}

export async function writeProgram(actor: ActorView, id: string, expected: number, draft: Plan, profile: Profile, publish: boolean) {
  staffOnly(actor);
  const person = await clientRequired(actor, id);
  const version: Edition = { id: randomUUID(), plan: draft, at: atNow(), profile: { ...profile, note: '' } };
  await verifyProgramMedia(actor, person.id, draft);
  const updated = await change(programBucket, person.id, initialProgram(), current => {
    if (current.revision !== expected) throw new AppError('Der Plan wurde inzwischen geändert. Lade den aktuellen Stand.', 409);
    return { revision: current.revision + 1, draft, profile, published: publish ? version : current.published,
      history: publish && current.published ? [current.published, ...current.history].slice(0, 16) : current.history };
  });
  if (publish) await audit(actor, person.id, 'Plan freigegeben');
  return updated;
}

async function verifyProgramMedia(actor: ActorView, id: string, draft: Plan) {
  const links = draft.items.flatMap(item => [item.media, ...[...item.exercises, ...(item.short?.exercises ?? [])].map(exercise => exercise.video)]);
  for (const path of new Set(links.filter(link => link.startsWith('/api/coaching-portal/file/')))) {
    const media = await read<Media>('files', path.split('/').at(-1)!);
    if (!media || (media.client !== id && media.client !== null) ||
      (media.client === null && actor.role !== 'owner' && media.owner !== actor.id && media.owner !== 'cms-owner')) {
      throw new AppError('Eine Datei ist für diesen Kunden nicht freigegeben.', 403);
    }
  }
}

export function publishedView(program: Program): Program {
  return { revision: program.revision, draft: emptyPlan(program.published?.plan.start),
    profile: { ...(program.published?.profile ?? emptyProfile), note: '' },
    published: program.published ? { ...program.published, plan: visiblePlan(program.published.plan) } : null,
    history: program.history.map(edition => ({ ...edition, plan: visiblePlan(edition.plan) })) };
}

export async function portalSnapshot(actor: ActorView, requested: string | null) {
  const isClient = actor.role === 'client';
  const people = isClient ? [] : await directory();
  const customers = people.filter(person => canOpen(actor, person)).map(publicPerson);
  const selection = isClient ? requested || actor.id : requested || customers[0]?.id;
  const coaches = actor.role === 'owner' ? people.filter(person => person.role === 'coach').map(publicPerson) : [];
  const library = isClient ? [] : (await list<LibraryItem>(libraryBucket, 500)).filter(item => actor.role === 'owner' || item.owner === 'cms-owner' || item.owner === actor.id);
  if (!selection) return { actor, directory: customers, coaches, library, client: null };
  const person = await clientRequired(actor, selection);
  const [program, logs, sharing, messages, auditRecords] = await Promise.all([
    getProgram(person.id), list<Activity>(activityBucket(person.id), 700), healthSharing(person.id),
    list<ChatMessage>(chatBucket(person.id), 180), isClient ? [] : list<Audit>(auditBucket(person.id), 60),
  ]);
  const showChat = Boolean(program.published?.plan.features.chat);
  const showTracking = Boolean(program.published?.plan.features.tracking);
  const metrics = isClient || (sharing && showTracking) ? await list<MetricRow>(metricBucket(person.id), 700) : [];
  const { deviceStatus } = await import('./trackers');
  return { actor, directory: customers, coaches, library, client: {
    person: isClient ? { ...publicPerson(person), coaches: [] } : publicPerson(person),
    program: isClient ? publishedView(program) : program, logs, metrics,
    messages: isClient && !showChat ? [] : messages.reverse().map(message =>
      isClient ? { ...message, sender: undefined } : message),
    devices: isClient ? await deviceStatus(person.id) : [],
    sharing, audit: auditRecords
  } };
}

export async function putLibrary(actor: ActorView, value: Omit<LibraryItem, 'owner' | 'created'>) {
  staffOnly(actor);
  const now = atNow();
  return change<LibraryItem | null>(libraryBucket, value.id, null, current => {
    if (current && actor.role !== 'owner' && current.owner !== actor.id) throw new AppError('Diese Vorlage ist für dich schreibgeschützt.', 403);
    return { ...value, owner: current?.owner ?? actor.id, created: current?.created ?? now };
  });
}
export async function removeLibrary(actor: ActorView, id: string) {
  staffOnly(actor);
  const entry = await read<LibraryItem>(libraryBucket, id);
  if (!entry || (actor.role !== 'owner' && entry.owner !== actor.id)) throw new AppError('Vorlage nicht gefunden.', 404);
  await remove(libraryBucket, id);
}

export async function activity(actor: ActorView, input: Omit<Activity, 'id' | 'title' | 'kind' | 'updated'>) {
  if (actor.role !== 'client') throw new AppError('Trainingsdaten werden im Kundenkonto erfasst.', 403);
  const user = await clientRequired(actor, actor.id);
  const program = await getProgram(user.id);
  const edition = [program.published, ...program.history].find(value => value?.id === input.edition);
  const item = edition?.plan.items.find(value => value.id === input.item);
  if (!edition || !item || !isEnabled(item, edition.plan) || addDays(edition.plan.start, item.day) !== input.date ||
    (program.published?.id !== edition.id && input.date >= today())) throw new AppError('Die Einheit ist in dieser Fassung nicht verfügbar.', 409);
  const exercises = input.variant === 'short' ? item.short?.exercises : item.exercises;
  if (!exercises || input.sets.some(set => !exercises.some(exercise => exercise.id === set.exercise && exercise.sets >= set.set)) ||
      new Set(input.sets.map(set => set.exercise + ':' + set.set)).size !== input.sets.length) throw new AppError('Prüfe die Angaben zu deinen Sätzen.');
  for (const [id, answer] of Object.entries(input.answers)) {
    const question = item.questions.find(value => value.id === id);
    if (!question || typeof answer !== (question.type === 'rating' ? 'number' : question.type === 'text' ? 'string' : question.type) ||
      (question.type === 'rating' && (typeof answer !== 'number' || answer < 1 || answer > 5 || !Number.isInteger(answer)))) {
      throw new AppError('Prüfe deine Check-in-Antworten.');
    }
  }
  const logId = input.edition + ':' + input.item;
  const record: Activity = { ...input, id: logId, title: item.title, kind: item.kind, updated: atNow() };
  await save(activityBucket(user.id), logId, record);
  return record;
}
export async function sendMessage(actor: ActorView, id: string | null, messageId: string, text: string, media?: string) {
  const person = await clientRequired(actor, id);
  const program = await getProgram(person.id);
  if (!program.published?.plan.features.chat) throw new AppError('Der Chat ist für dieses Coaching noch nicht freigegeben.', 409);
  if (media) {
    const record = await read<Media>('files', media.split('/').at(-1)!);
    if (!record || record.client !== person.id || record.owner !== actor.id) throw new AppError('Anhang nicht verfügbar.', 403);
  }
  const message: ChatMessage = { id: messageId, who: actor.role === 'client' ? 'client' : 'team', sender: actor.name, text, at: atNow(), ...(media ? {media} : {}) };
  const result = await change<ChatMessage | null>(chatBucket(person.id), messageId, null, existing => existing ?? message);
  return actor.role === 'client' ? { ...result!, sender: undefined } : result;
}
export async function messages(actor: ActorView, id: string | null) {
  const person = await clientRequired(actor, id);
  const program = await getProgram(person.id);
  if (!program.published?.plan.features.chat) return [];
  return (await list<ChatMessage>(chatBucket(person.id), 180)).reverse().map(message =>
    actor.role === 'client' ? { ...message, sender: undefined } : message);
}
export async function healthSharing(id: string) {
  return (await read<{ sharing: boolean }>(privateSettings, id))?.sharing ?? false;
}
export async function setHealthSharing(actor: ActorView, sharing: boolean) {
  const person = await ownTrackerAccount(actor, { allowPaused: !sharing });
  await save(privateSettings, person.id, { sharing });
}
export async function ownTrackerAccount(actor: ActorView, { allowPaused = false } = {}) {
  if (actor.role !== 'client') throw new AppError('Geräte lassen sich im Kundenkonto verbinden.', 403);
  const person = await clientRequired(actor, actor.id);
  if (!allowPaused && !(await getProgram(person.id)).published?.plan.features.tracking) throw new AppError('Fortschrittsdaten wurden für dieses Profil noch nicht freigegeben.', 409);
  return person;
}
export async function addMetrics(id: string, source: HealthSource, values: Metrics[]) {
  for (const value of values) {
    if (value.date > addDays(today(), 1)) continue;
    await change<MetricRow | null>(metricBucket(id), source + ':' + value.date, null,
      current => ({ ...current, ...value, source }));
  }
}
export async function clearMetrics(id: string, source: HealthSource) {
  for (const row of await list<MetricRow>(metricBucket(id), 3000)) {
    if (row.source === source) await remove(metricBucket(id), source + ':' + row.date);
  }
}

export type Media = { id: string; client: string | null; owner: string; pathname: string; name: string; type: string; purpose: 'plan' | 'chat' };
export function planContainsMedia(value: Plan, id: string) {
  const href = '/api/coaching-portal/file/' + id;
  return value.items.some(item => isEnabled(item, value) && (item.media === href || [...item.exercises, ...(item.short?.exercises ?? [])].some(exercise => exercise.video === href)));
}
export async function mediaAccess(actor: ActorView, media: Media) {
  if (actor.role === 'owner') return;
  if (actor.id === media.owner) {
    if (media.client) await clientRequired(actor, media.client);
    return;
  }
  if (actor.role === 'coach') {
    if (!media.client) {
      if (media.owner === 'cms-owner') return;
      throw new AppError('Datei nicht verfügbar.', 404);
    }
    await clientRequired(actor, media.client);
    return;
  }
  const person = await clientRequired(actor, actor.id);
  if (media.client && media.client !== person.id) throw new AppError('Datei nicht verfügbar.', 404);
  const program = await getProgram(person.id);
  if (media.purpose === 'chat' && media.client === person.id && program.published?.plan.features.chat) {
    const chat = await messages(actor, person.id);
    if (chat.some(message => message.media === '/api/coaching-portal/file/' + media.id)) return;
  }
  if (program.published && planContainsMedia(program.published.plan, media.id)) return;
  throw new AppError('Datei nicht verfügbar.', 404);
}
