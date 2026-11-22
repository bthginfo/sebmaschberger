import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_CLUB_APPEARANCE } from '../src/lib/club/appearance-model';
import { calendarDownload, calendarEventDownload, fixtureExport } from '../src/lib/club/exports';
import type { ClubMatch, ClubPerson, ClubTeam, ClubTraining, ClubWorkspace } from '../src/lib/club/model';
import { clubAttention, clubRecordHref, clubRecordRef, trainingReadiness } from '../src/lib/club/records';

const now = Date.parse('2026-11-11T12:00:00Z');
const at = (hours: number) => new Date(now + hours * 3_600_000).toISOString();
const team: ClubTeam = { id: 'team-1', revision: 1, name: 'Example XV', shortName: 'XV', color: '#114422', description: '', managerIds: [] };
const person = (id: string, teamIds: string[], status: ClubPerson['status'] = 'active'): ClubPerson => ({
  id, revision: 1, name: id, status, role: 'member', teamIds, position: '', jersey: null, bio: '', avatar: false,
});
const training: ClubTraining = {
  id: 'session', revision: 1, teamId: team.id, title: 'Grüße, Team;\nBEGIN:VEVENT', startsAt: at(3), endsAt: at(4),
  location: 'Club pitch', details: 'Internal instructions', equipment: '', attendance: [
    { personId: 'attending', response: 'yes' }, { personId: 'foreign', response: 'yes' }, { personId: 'invited', response: 'no' },
  ],
};
const match = (id: string, hours: number, status: ClubMatch['status'], published = false): ClubMatch => ({
  id, revision: 1, teamId: team.id, opponent: '  =1+1', startsAt: at(hours), venue: 'Pitch', home: true, status, public: published,
  ourScore: status === 'final' ? 18 : null, theirScore: status === 'final' ? 12 : null, notes: 'Internal result note',
});
const workspace: ClubWorkspace = {
  actor: { id: 'coach', name: 'Coach', owner: false, role: 'coach', teamIds: [team.id] }, brandName: 'Example Club',
  people: [person('attending', [team.id]), person('awaiting', [team.id]), person('foreign', ['team-2']), person('invited', [team.id], 'invited')],
  teams: [team], trainings: [training], matches: [match('needs-score', -3, 'scheduled'), match('ongoing', -1, 'scheduled'),
    match('not-published', -5, 'final'), match('already-public', -7, 'final', true), match('future', 8, 'scheduled')],
  news: [], assignments: [], plays: [], mailAvailable: false, appearance: DEFAULT_CLUB_APPEARANCE,
  invites: [{ id: 'private-invite', role: 'member', email: 'nobody@example.test', name: 'Test', expiresAt: at(8) }],
  capabilities: { manage: true, news: true, invite: false, assign: true, design: false, coachStudio: true },
};

test('training follow-up counts eligible active players and omits invitations outside admin scope', () => {
  const readiness = trainingReadiness(workspace, training);
  assert.equal(readiness.total, 2);
  assert.deepEqual(readiness.counts, { yes: 1, maybe: 0, no: 0, awaiting: 1 });
  const attention = clubAttention(workspace, now);
  assert.equal(attention.training?.awaiting, 1);
  assert.deepEqual(attention.missingResults.map(row => row.id), ['needs-score']);
  assert.deepEqual(attention.unpublishedResults.map(row => row.id), ['not-published']);
  assert.deepEqual(attention.pendingInvites, []);
});

test('record links retain workspace context and reject unknown kinds or identifiers', () => {
  const id = '9ca01d87-33ea-4e7b-897b-000000000002';
  const ref = clubRecordRef('teams', id)!;
  assert.equal(clubRecordHref(true, ref), '/admin/club/teams/' + id);
  assert.equal(clubRecordHref(false, ref), '/members/manage/teams/' + id);
  assert.equal(clubRecordRef('settings', id), undefined);
  assert.equal(clubRecordRef('teams', '..'), undefined);
});

test('club exports omit private notes, escape spreadsheet formulas and calendar text, and honor team scope', () => {
  const outside = { ...match('foreign-match', 9, 'scheduled'), teamId: 'team-2', opponent: 'Foreign club' };
  const selected = { ...workspace, matches: [...workspace.matches, outside] };
  const ics = calendarDownload(selected, now);
  assert.match(ics, /DTSTART:20261111T150000Z/u);
  assert(ics.includes('SUMMARY:Grüße\\, Team\\;\\nBEGIN:VEVENT'));
  assert(!ics.includes('Internal') && !ics.includes('foreign-match') && !ics.includes('ongoing'));
  assert(ics.split('\r\n').every(line => Buffer.byteLength(line) <= 75));
  const csv = fixtureExport(selected, 'en');
  assert(csv.includes("\"'  =1+1\"") && !csv.includes('Internal') && !csv.includes('Foreign club'));
});

test('single-event calendar exports only a future event within the viewer’s teams', () => {
  const laterMatch = match('later', 181 * 24, 'scheduled');
  const cancelled = match('cancelled', 4, 'cancelled');
  const foreign = { ...match('foreign', 6, 'scheduled'), teamId: 'team-2' };
  const schedule = { ...workspace, matches: [...workspace.matches, laterMatch, cancelled, foreign] };
  const matchFile = calendarEventDownload(schedule, 'match', laterMatch.id, now);
  assert(matchFile);
  assert(matchFile.includes('UID:match-later@club-calendar'));
  assert.equal(matchFile.split('\r\n').filter(line => line === 'BEGIN:VEVENT').length, 1);
  assert(!calendarDownload(schedule, now).includes('UID:match-later'));
  assert(calendarEventDownload(schedule, 'training', training.id, now)?.includes('LOCATION:Club pitch'));
  for (const id of [cancelled.id, foreign.id, 'ongoing', 'unknown']) {
    assert.equal(calendarEventDownload(schedule, 'match', id, now), null);
  }
});
