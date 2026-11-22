import type { ClubActor, ClubAssignment, ClubPlayAccess } from './model';

export function managesClubPlay(actor: ClubActor, ownerId?: string) {
  return actor.role === 'admin' || actor.role === 'coach' && actor.id === ownerId;
}

export function assignmentMatches(actor: ClubActor, assignment: ClubAssignment) {
  return assignment.targetType === 'person' ? assignment.targetId === actor.id : actor.teamIds.includes(assignment.targetId);
}

export function clubPlayAccess(actor: ClubActor, playId: string, ownerId: string | undefined, assignments: ClubAssignment[]): ClubPlayAccess | undefined {
  if (managesClubPlay(actor, ownerId)) return 'edit';
  let access: ClubPlayAccess | undefined;
  for (const assignment of assignments) {
    if (assignment.playId !== playId || !assignmentMatches(actor, assignment)) continue;
    if (assignment.access === 'edit') return 'edit';
    access = 'view';
  }
  return access;
}
