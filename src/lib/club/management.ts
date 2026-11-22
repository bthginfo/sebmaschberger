import 'server-only';
import { randomUUID } from 'node:crypto';
import { AppError } from '@/lib/db';
import { getClubCoachEntry } from '@/lib/coach/store';
import { accessDenied, activeTeam, assertTeam, canEditPerson, canManageTeam, clubCalendar, clubCoach, clubDirectory, clubManager, clubWide, revisionConflict, seesTeam, updateCalendar, updateDirectory, type ClubCalendar, type ClubDirectory } from './data';
import type { ClubActor, ClubRsvp } from './model';
import type { z } from 'zod';
import type { assignmentFields, matchFields, newsFields, profileInput, teamFields, trainingFields } from './validation';

type Revisioned = { id: string; revision: number };
type Input<T> = Omit<T, keyof Revisioned>;
type Slot = { id: string; revision?: number };
type CalendarKey = keyof ClubCalendar;

function existing<Row extends Revisioned>(rows: readonly Row[], slot: Slot) {
  const row = rows.find(item => item.id === slot.id);
  if (!row) throw new AppError('This entry is unavailable.', 404);
  if (slot.revision !== row.revision) revisionConflict();
  return row;
}

function saveRow<Row extends Revisioned>(rows: readonly Row[], slot: Slot, build: (previous?: Row) => Input<Row>) {
  const previous = slot.revision === undefined ? undefined : existing(rows, slot);
  const row = { ...build(previous), id: slot.id, revision: (previous?.revision ?? 0) + 1 } as Row;
  if (!previous && rows.length >= 1_000) throw new AppError('This list has reached its capacity.', 409);
  return previous ? rows.map(item => item.id === row.id ? row : item) : [...rows, row];
}

function checkManage(actor: ClubActor, directory: ClubDirectory, teamId: string) {
  if (!canManageTeam(actor, teamId)) accessDenied();
  assertTeam(directory, teamId);
}

function checkNews(actor: ClubActor, directory: ClubDirectory, teamId: string | null) {
  if (teamId) checkManage(actor, directory, teamId);
  else if (!clubWide(actor)) accessDenied();
}

function checkTarget(actor: ClubActor, directory: ClubDirectory, type: 'person' | 'team', id: string) {
  if (type === 'team') return checkManage(actor, directory, id);
  const person = directory.people.find(item => item.id === id && item.status !== 'disabled');
  if (!person || !canEditPerson(actor, person)) accessDenied();
}

export async function saveClubTeam(actor: ClubActor, slot: Slot, input: z.infer<typeof teamFields>) {
  if (!clubManager(actor)) accessDenied();
  const { managerIds, ...fields } = input;
  if (managerIds !== undefined && !clubWide(actor)) accessDenied();
  await updateDirectory(directory => ({
    ...directory,
    teams: saveRow(directory.teams, slot, previous => {
      if (previous) checkManage(actor, directory, previous.id);
      if (managerIds?.some(id => !directory.people.some(person => person.id === id && person.status === 'active' && (person.role === 'coach' || person.role === 'admin')))) {
        throw new AppError('Select active coaches or club admins as team leads.', 400);
      }
      return { ...previous, ...fields, managerIds: managerIds ?? previous?.managerIds ?? (actor.role === 'coach' ? [actor.id] : []) };
    }),
  }));
  return slot.id;
}

export async function archiveClubTeam(actor: ClubActor, slot: Slot) {
  await updateDirectory(directory => {
    checkManage(actor, directory, slot.id);
    const team = existing(directory.teams, slot);
    return { ...directory, teams: directory.teams.map(item => item.id === team.id ? { ...item, archived: true, revision: item.revision + 1 } : item) };
  });
}

export async function updateClubProfile(actor: ClubActor, id: string, input: z.infer<typeof profileInput>) {
  const version = randomUUID();
  await updateDirectory(directory => {
    const person = existing(directory.people, { id, revision: input.revision });
    if (!canEditPerson(actor, person)) accessDenied();
    if ((input.role !== undefined || input.status !== undefined) && actor.role !== 'admin') accessDenied();
    if (input.teamIds !== undefined && !clubWide(actor)) accessDenied();
    if (input.status !== undefined && input.status !== person.status && (input.status === 'invited' || input.status === 'active' && !person.hash)) {
      throw new AppError('This person needs a valid invitation to activate their account.', 409);
    }
    input.teamIds?.forEach(teamId => assertTeam(directory, teamId));
    const { revision: _revision, ...patch } = input;
    const changes = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
    const next = {
      ...person, ...changes, revision: person.revision + 1,
      sessionVersion: input.status !== undefined && input.status !== person.status ? version : person.sessionVersion,
      invitation: input.status === 'disabled' ? undefined : person.invitation,
    };
    return { ...directory, people: directory.people.map(item => item.id === id ? next : item) };
  });
}

export async function saveTraining(actor: ClubActor, slot: Slot, input: z.infer<typeof trainingFields>) {
  const directory = await clubDirectory();
  checkManage(actor, directory, input.teamId);
  if (input.endsAt <= input.startsAt) throw new AppError('End time must be after the start time.', 400);
  await updateCalendar(calendar => ({
    ...calendar,
    trainings: saveRow(calendar.trainings, slot, previous => {
      if (previous) checkManage(actor, directory, previous.teamId);
      return { ...input, responses: previous?.teamId === input.teamId ? previous.responses : {} };
    }),
  }));
  return slot.id;
}

export async function respondToTraining(actor: ClubActor, id: string, response: ClubRsvp | null) {
  if (actor.owner) accessDenied();
  const directory = await clubDirectory();
  await updateCalendar(calendar => {
    const training = calendar.trainings.find(item => item.id === id);
    if (!training || !activeTeam(directory, training.teamId) || !actor.teamIds.includes(training.teamId)) accessDenied();
    if (Date.parse(training.startsAt) <= Date.now()) throw new AppError('Responses for this training are closed.', 409);
    const responses = { ...training.responses };
    if (response) responses[actor.id] = response;
    else delete responses[actor.id];
    return { ...calendar, trainings: calendar.trainings.map(item => item.id === id ? { ...item, responses } : item) };
  });
}

export async function saveClubMatch(actor: ClubActor, slot: Slot, input: z.infer<typeof matchFields>) {
  const directory = await clubDirectory();
  checkManage(actor, directory, input.teamId);
  if (input.status === 'final' && (input.ourScore === null || input.theirScore === null)) throw new AppError('Enter both scores to mark the match as final.', 400);
  const result = input.status === 'final' ? input : { ...input, ourScore: null, theirScore: null };
  await updateCalendar(calendar => ({
    ...calendar,
    matches: saveRow(calendar.matches, slot, previous => {
      if (previous) checkManage(actor, directory, previous.teamId);
      return result;
    }),
  }));
  return slot.id;
}

export async function saveClubNews(actor: ClubActor, slot: Slot, input: z.infer<typeof newsFields>) {
  const directory = await clubDirectory();
  checkNews(actor, directory, input.teamId);
  const updatedAt = new Date().toISOString();
  await updateCalendar(calendar => ({
    ...calendar,
    news: saveRow(calendar.news, slot, previous => {
      if (previous) checkNews(actor, directory, previous.teamId);
      return { ...input, updatedAt };
    }),
  }));
  return slot.id;
}

async function assertPlayManager(actor: ClubActor, id: string) {
  if (!clubCoach(actor)) accessDenied();
  const play = await getClubCoachEntry(id);
  if (!play) throw new AppError('This play is unavailable.', 404);
  if (actor.role !== 'admin' && play.ownerId !== actor.id) accessDenied();
}

export async function saveClubAssignment(actor: ClubActor, slot: Slot, input: z.infer<typeof assignmentFields>) {
  const [directory, snapshot] = await Promise.all([clubDirectory(), clubCalendar()]);
  const previous = slot.revision === undefined ? undefined : existing(snapshot.assignments, slot);
  await Promise.all([assertPlayManager(actor, input.playId), ...(previous ? [assertPlayManager(actor, previous.playId)] : [])]);
  checkTarget(actor, directory, input.targetType, input.targetId);
  const updatedAt = new Date().toISOString();
  await updateCalendar(calendar => ({
    ...calendar,
    assignments: saveRow(calendar.assignments, slot, old => {
      if (old) checkTarget(actor, directory, old.targetType, old.targetId);
      if (calendar.assignments.some(item => item.id !== slot.id && item.playId === input.playId && item.targetType === input.targetType && item.targetId === input.targetId)) {
        throw new AppError('This play is already assigned to the selected audience.', 409);
      }
      return { ...input, updatedAt };
    }),
  }));
  return slot.id;
}

export async function deleteCalendarEntry(actor: ClubActor, key: CalendarKey, slot: Slot) {
  const directory = await clubDirectory();
  if (key === 'assignments') {
    const entry = existing((await clubCalendar()).assignments, slot);
    await assertPlayManager(actor, entry.playId);
    if (entry.targetType === 'team' && !seesTeam(actor, entry.targetId)) accessDenied();
  }
  await updateCalendar(calendar => {
    switch (key) {
      case 'trainings': {
        const entry = existing(calendar.trainings, slot);
        if (!canManageTeam(actor, entry.teamId)) accessDenied();
        return { ...calendar, trainings: calendar.trainings.filter(item => item.id !== slot.id) };
      }
      case 'matches': {
        const entry = existing(calendar.matches, slot);
        if (!canManageTeam(actor, entry.teamId)) accessDenied();
        return { ...calendar, matches: calendar.matches.filter(item => item.id !== slot.id) };
      }
      case 'news': {
        const entry = existing(calendar.news, slot);
        if (entry.teamId ? !canManageTeam(actor, entry.teamId) : !clubWide(actor)) accessDenied();
        return { ...calendar, news: calendar.news.filter(item => item.id !== slot.id) };
      }
      case 'assignments': {
        existing(calendar.assignments, slot);
        return { ...calendar, assignments: calendar.assignments.filter(item => item.id !== slot.id) };
      }
    }
  });
}
