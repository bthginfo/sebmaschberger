import type { ClubMatch, ClubTeam, ClubTraining } from './model';

type ExportWorkspace = { teams: ClubTeam[]; matches: ClubMatch[]; trainings: ClubTraining[] };
const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]|\.\d{3}/g, '');
const text = (value: string) => value.replaceAll('\\', '\\\\').replace(/\r?\n|\r/g, '\\n').replaceAll(',', '\\,').replaceAll(';', '\\;');

function fold(line: string) {
  let used = 0;
  let result = '';
  for (const char of line) {
    const width = Buffer.byteLength(char);
    if (used + width > 75) {
      result += '\r\n ';
      used = 1;
    }
    result += char;
    used += width;
  }
  return result;
}

export function calendarDownload(workspace: ExportWorkspace, now = Date.now(), through = now + 180 * 86_400_000) {
  const teamNames = new Map(workspace.teams.map(team => [team.id, team.name]));
  const inRange = (startsAt: string) => Date.parse(startsAt) >= now && Date.parse(startsAt) <= through;
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Website Starter//Club Calendar//EN', 'CALSCALE:GREGORIAN'];
  const generated = stamp(new Date(now).toISOString());
  const events = [
    ...workspace.trainings.filter(item => inRange(item.startsAt)).map(item => ({
      id: 'training-' + item.id, title: item.title, start: item.startsAt, end: item.endsAt, venue: item.location, teamId: item.teamId,
    })),
    ...workspace.matches.filter(item => item.status === 'scheduled' && inRange(item.startsAt)).map(item => ({
      id: 'match-' + item.id, title: (teamNames.get(item.teamId) ?? '') + ' v ' + item.opponent, start: item.startsAt, end: undefined, venue: item.venue, teamId: item.teamId,
    })),
  ].filter(item => teamNames.has(item.teamId)).sort((a, b) => a.start.localeCompare(b.start));
  for (const event of events) {
    lines.push('BEGIN:VEVENT', 'UID:' + event.id + '@club-calendar', 'DTSTAMP:' + generated, 'DTSTART:' + stamp(event.start));
    if (event.end) lines.push('DTEND:' + stamp(event.end));
    lines.push('SUMMARY:' + text(event.title));
    if (event.venue) lines.push('LOCATION:' + text(event.venue));
    lines.push('END:VEVENT');
  }
  return [...lines, 'END:VCALENDAR', ''].map(fold).join('\r\n');
}

export function calendarEventDownload(workspace: ExportWorkspace, kind: 'training' | 'match', id: string, now = Date.now()) {
  const trainings = kind === 'training' ? workspace.trainings.filter(item => item.id === id) : [];
  const matches = kind === 'match' ? workspace.matches.filter(item => item.id === id && item.status === 'scheduled') : [];
  const event = trainings[0] ?? matches[0];
  if (!event || !(Date.parse(event.startsAt) >= now) || !workspace.teams.some(team => team.id === event.teamId)) return null;
  return calendarDownload({ teams: workspace.teams, trainings, matches }, now, Date.parse(event.startsAt));
}

function csvCell(value: string | number | boolean | null) {
  const cell = value === null ? '' : String(value);
  const safe = /^[\t\r\n]|^\s*[=+@-]/u.test(cell) ? "'" + cell : cell;
  return '"' + safe.replaceAll('"', '""') + '"';
}

export function fixtureExport(workspace: Pick<ExportWorkspace, 'teams' | 'matches'>, language: 'en' | 'de') {
  const teams = new Map(workspace.teams.map(team => [team.id, team.name]));
  const headers = language === 'en' ? ['Team', 'Opponent', 'Kick-off (UTC)', 'Venue', 'Home', 'Status', 'Our score', 'Opposition score', 'Public']
    : ['Team', 'Gegner', 'Ankick (UTC)', 'Spielort', 'Heim', 'Status', 'Eigene Punkte', 'Gegnerpunkte', 'Öffentlich'];
  const state = { scheduled: 'Geplant', final: 'Beendet', cancelled: 'Abgesagt' };
  const rows = workspace.matches.filter(match => teams.has(match.teamId)).sort((a, b) => b.startsAt.localeCompare(a.startsAt)).map(match => [
    teams.get(match.teamId)!, match.opponent, match.startsAt, match.venue, match.home,
    language === 'en' ? match.status : state[match.status], match.ourScore, match.theirScore, match.public,
  ]);
  return '\uFEFF' + [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
