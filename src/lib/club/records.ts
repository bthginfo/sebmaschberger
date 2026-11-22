import type { ClubPerson, ClubRsvp, ClubTraining, ClubWorkspace } from './model';

const kinds = ['teams', 'people', 'trainings', 'matches'] as const;
export type ClubRecordKind = (typeof kinds)[number];
export type ClubRecordRef = { kind: ClubRecordKind; id: string };

export function clubManagementHref(owner: boolean) {
  return owner ? '/admin/club' : '/members/manage';
}

export function clubRecordHref(owner: boolean, { kind, id }: ClubRecordRef) {
  return clubManagementHref(owner) + '/' + kind + '/' + encodeURIComponent(id);
}

export function clubRecordRef(kind: string, id: string): ClubRecordRef | undefined {
  if (!kinds.some(value => value === kind) || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/iu.test(id)) return;
  return { kind: kind as ClubRecordKind, id };
}

export function trainingReadiness(workspace: Pick<ClubWorkspace, 'people'>, training: ClubTraining) {
  const responses = new Map(training.attendance?.map(row => [row.personId, row.response]));
  const rows: { person: ClubPerson; response: ClubRsvp | null }[] = [];
  const counts = { yes: 0, no: 0, maybe: 0, awaiting: 0 };
  for (const person of workspace.people) {
    if (person.status !== 'active' || !person.teamIds.includes(training.teamId)) continue;
    const response = responses.get(person.id) ?? null;
    counts[response ?? 'awaiting']++;
    rows.push({ person, response });
  }
  return { rows, counts, total: rows.length };
}

export function clubAttention(workspace: ClubWorkspace, now = Date.now()) {
  const hour = 3_600_000;
  const day = hour * 24;
  const recent = (startsAt: string) => {
    const at = Date.parse(startsAt);
    return at <= now && at >= now - 45 * day;
  };
  const descending = <T extends { startsAt: string }>(a: T, b: T) => b.startsAt.localeCompare(a.startsAt);
  const pendingInvites = workspace.capabilities.invite ? workspace.invites.filter(item => Date.parse(item.expiresAt) > now) : [];
  const expiredInvites = workspace.capabilities.invite ? workspace.invites.filter(item => Date.parse(item.expiresAt) <= now) : [];
  const missingResults = workspace.matches.filter(match => match.status === 'scheduled' && recent(match.startsAt) && Date.parse(match.startsAt) < now - 2 * hour).sort(descending);
  const unpublishedResults = workspace.matches.filter(match => match.status === 'final' && !match.public && recent(match.startsAt)).sort(descending);
  const training = [...workspace.trainings].sort((a, b) => a.startsAt.localeCompare(b.startsAt)).flatMap(entry => {
    const starts = Date.parse(entry.startsAt);
    if (!entry.attendance || starts <= now || starts > now + 7 * day) return [];
    const { counts, total } = trainingReadiness(workspace, entry);
    return counts.awaiting ? [{ entry, awaiting: counts.awaiting, total }] : [];
  })[0];
  return { pendingInvites, expiredInvites, missingResults, unpublishedResults, training };
}
