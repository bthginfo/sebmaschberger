import 'server-only';
import { AppError, getRecord, mutateRecord } from '@/lib/db';
import type { ClubActor, ClubAssignment, ClubMatch, ClubNews, ClubPerson, ClubTeam, ClubTraining } from './model';

export interface ClubAccount extends ClubPerson {
  email: string;
  hash?: string;
  sessionVersion: string;
  invitation?: { hash: string; expiresAt: string };
}
export type StoredTraining = Omit<ClubTraining, 'response' | 'attendance'> & { responses: Record<string, 'yes' | 'no' | 'maybe'> };

export interface ClubDirectory {
  people: ClubAccount[];
  teams: ClubTeam[];
}
export interface ClubCalendar {
  trainings: StoredTraining[];
  matches: ClubMatch[];
  news: ClubNews[];
  assignments: ClubAssignment[];
}

const directorySeed: ClubDirectory = { people: [], teams: [] };
const calendarSeed: ClubCalendar = { trainings: [], matches: [], news: [], assignments: [] };

export async function clubDirectory() {
  return await getRecord<ClubDirectory>('club', 'directory') ?? structuredClone(directorySeed);
}
export async function clubCalendar() {
  return await getRecord<ClubCalendar>('club', 'calendar') ?? structuredClone(calendarSeed);
}
export function updateDirectory(update: (value: ClubDirectory) => ClubDirectory) {
  return mutateRecord('club', 'directory', directorySeed, update);
}
export function updateCalendar(update: (value: ClubCalendar) => ClubCalendar) {
  return mutateRecord('club', 'calendar', calendarSeed, update);
}

export function accountActor(account: ClubAccount, teams: ClubTeam[]): ClubActor {
  const assignments = account.role === 'coach' ? teams.filter(team => team.managerIds.includes(account.id)).map(team => team.id) : [];
  const active = new Set(teams.filter(team => !team.archived).map(team => team.id));
  return { id: account.id, name: account.name, role: account.role, owner: false, teamIds: [...new Set([...account.teamIds, ...assignments])].filter(id => active.has(id)) };
}
export function clubWide(actor: ClubActor) {
  return actor.role === 'admin' || actor.role === 'board';
}
export function clubManager(actor: ClubActor) {
  return actor.role !== 'member';
}
export function clubCoach(actor: ClubActor) {
  return actor.role === 'coach' || actor.role === 'admin';
}
export function seesTeam(actor: ClubActor, teamId: string) {
  return clubWide(actor) || actor.teamIds.includes(teamId);
}
export function canManageTeam(actor: ClubActor, teamId: string) {
  return clubManager(actor) && seesTeam(actor, teamId);
}
export function canSeePerson(actor: ClubActor, person: ClubPerson) {
  return actor.id === person.id || clubWide(actor) || person.status === 'active' && person.teamIds.some(id => actor.teamIds.includes(id));
}

export function canReadClubPerson(actor: ClubActor, person: ClubPerson, teams: readonly ClubTeam[]) {
  return canSeePerson(actor, person) || person.status === 'active' && (person.role === 'coach' || person.role === 'admin')
    && teams.some(team => !team.archived && seesTeam(actor, team.id) && team.managerIds.includes(person.id));
}
export function canEditPerson(actor: ClubActor, person: ClubPerson) {
  return actor.id === person.id || clubWide(actor) || actor.role === 'coach' && canSeePerson(actor, person);
}
export function projectPerson(person: ClubAccount, showEmail: boolean): ClubPerson {
  const { hash: _hash, sessionVersion: _version, invitation: _invite, email, ...profile } = person;
  return showEmail ? { ...profile, email } : profile;
}
export function activeTeam(directory: ClubDirectory, id: string) {
  return directory.teams.find(team => team.id === id && !team.archived);
}
export function assertTeam(directory: ClubDirectory, id: string) {
  const team = activeTeam(directory, id);
  if (!team) throw new AppError('This team is unavailable.', 404);
  return team;
}
export function accessDenied(): never {
  throw new AppError('You do not have access to this action.', 403);
}
export function revisionConflict(): never {
  throw new AppError('This entry changed. Refresh it before saving.', 409);
}
