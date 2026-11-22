import 'server-only';
import { listClubCoachEntries } from '@/lib/coach/store';
import { localizeCoachPreset } from '@/lib/coach/presets';
import { newsletterMailReady } from '@/lib/mail';
import { getClubAppearance } from './appearance';
import { clubFeatures } from './enabled';
import { clubInviteSummary } from './auth';
import { accessDenied, canManageTeam, canReadClubPerson, clubCalendar, clubCoach, clubDirectory, clubManager, clubWide, projectPerson, seesTeam } from './data';
import type { ClubActor, ClubWorkspace } from './model';
import { assignmentMatches, clubPlayAccess, managesClubPlay } from './play-access';

export async function clubWorkspace(actor: ClubActor, mode: 'member' | 'manage', knownFeatures?: Awaited<ReturnType<typeof clubFeatures>>): Promise<ClubWorkspace> {
  const manage = mode === 'manage';
  if (manage && !clubManager(actor)) accessDenied();
  const feature = knownFeatures ?? await clubFeatures();
  const calendarRequest = clubCalendar();
  const boardRequest = !feature.coachStudio ? [] : clubCoach(actor) ? listClubCoachEntries() : calendarRequest.then(calendar =>
    calendar.assignments.some(assignment => assignmentMatches(actor, assignment)) ? listClubCoachEntries() : []);
  const [directory, calendar, boards, mailAvailable, appearance] = await Promise.all([
    clubDirectory(), calendarRequest, boardRequest, manage && actor.role === 'admin' ? newsletterMailReady() : false, getClubAppearance(),
  ]);
  const teams = directory.teams.filter(team => !team.archived && seesTeam(actor, team.id));
  const visibleTeams = new Set(teams.map(team => team.id));
  const people = directory.people
    .filter(person => canReadClubPerson(actor, person, teams) && (manage || person.status === 'active'))
    .map(person => {
      const profile = projectPerson(person, person.id === actor.id || manage && clubWide(actor));
      return clubWide(actor) || person.id === actor.id ? profile : { ...profile, teamIds: profile.teamIds.filter(id => visibleTeams.has(id)) };
    });
  const plays = boards.flatMap(({ record, ownerId }) => {
    const access = clubPlayAccess(actor, record.id, ownerId, calendar.assignments);
    if (!access) return [];
    const de = localizeCoachPreset(record, 'de');
    const en = localizeCoachPreset(record, 'en');
    const copy = de === en ? undefined : {
      de: { title: de.title, description: de.description },
      en: { title: en.title, description: en.description },
    };
    return [{
      id: record.id, title: record.play.title, description: record.play.description,
      phaseCount: record.play.frames.length, access,
      href: (actor.owner ? '/admin/coach/' : '/members/plays/') + record.id,
      canAssign: managesClubPlay(actor, ownerId), copy,
    }];
  });
  const assignable = new Set(plays.filter(play => play.canAssign).map(play => play.id));
  return {
    actor, teams, people, plays, brandName: feature.brandName,
    trainings: calendar.trainings.filter(entry => visibleTeams.has(entry.teamId)).map(({ responses, ...entry }) => ({
      ...entry, response: responses[actor.id] ?? null,
      ...(manage && canManageTeam(actor, entry.teamId) ? {
        attendance: Object.entries(responses).flatMap(([personId, response]) => people.some(person => person.id === personId && person.status === 'active' && person.teamIds.includes(entry.teamId)) ? [{ personId, response }] : []),
      } : {}),
    })).sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    matches: calendar.matches.filter(entry => visibleTeams.has(entry.teamId)).sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    news: calendar.news.filter(entry => (entry.published || manage) && (entry.teamId ? visibleTeams.has(entry.teamId) : entry.published || clubWide(actor)))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt)),
    assignments: feature.coachStudio ? calendar.assignments.filter(assignment => manage ? assignable.has(assignment.playId) : assignmentMatches(actor, assignment)) : [],
    invites: manage && actor.role === 'admin' ? directory.people.flatMap(person => {
      const invite = clubInviteSummary(person);
      return invite ? [invite] : [];
    }) : [],
    capabilities: { manage: clubManager(actor), invite: actor.role === 'admin', assign: feature.coachStudio && clubCoach(actor),
      news: clubManager(actor), design: actor.role === 'admin', coachStudio: feature.coachStudio },
    mailAvailable, appearance,
  };
}

export async function clubSchedule(actor: ClubActor) {
  const [directory, calendar] = await Promise.all([clubDirectory(), clubCalendar()]);
  const teams = directory.teams.filter(team => !team.archived && seesTeam(actor, team.id));
  const ids = new Set(teams.map(team => team.id));
  return {
    teams,
    matches: calendar.matches.filter(match => ids.has(match.teamId)),
    trainings: calendar.trainings.filter(training => ids.has(training.teamId)),
  };
}
