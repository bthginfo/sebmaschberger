import 'server-only';
import { revalidateTag, unstable_cache } from 'next/cache';
import { databaseCacheNamespace } from '@/lib/db';
import { clubCalendar, clubDirectory } from './data';
import type { PublicClubMatch } from './fixtures';

const tag = 'ws-club-fixtures';
export const publicClubFixtures = unstable_cache(async (): Promise<PublicClubMatch[]> => {
  const [directory, calendar] = await Promise.all([clubDirectory(), clubCalendar()]);
  const teams = new Map(directory.teams.filter(team => !team.archived).map(team => [team.id, team.name]));
  return calendar.matches.flatMap(match => {
    const team = teams.get(match.teamId);
    if (!match.public || !team || match.status === 'cancelled') return [];
    return [{
      id: match.id, team, opponent: match.opponent, startsAt: match.startsAt, venue: match.venue,
      home: match.home, status: match.status, ourScore: match.ourScore, theirScore: match.theirScore,
    }];
  });
}, ['ws-club-fixtures-v1', databaseCacheNamespace], { tags: [tag], revalidate: false });

export function refreshClubFixtures() {
  revalidateTag(tag, { expire: 0 });
}
