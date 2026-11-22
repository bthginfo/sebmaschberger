import type { ContentItem, SiteLanguage } from '@/lib/types';

export const CLUB_FIXTURE_MODES = ['next-home', 'upcoming', 'results'] as const;
export type ClubFixtureSource = { mode: (typeof CLUB_FIXTURE_MODES)[number]; limit: number };

export type PublicClubMatch = {
  id: string;
  team: string;
  opponent: string;
  startsAt: string;
  venue: string;
  home: boolean;
  status: 'scheduled' | 'final';
  ourScore: number | null;
  theirScore: number | null;
};

export function isClubTimeZone(value: string) {
  try { new Intl.DateTimeFormat('en', { timeZone: value }); return Boolean(value); } catch { return false; }
}

export function clubTimelineItems(fixtures: readonly PublicClubMatch[], source: ClubFixtureSource, language: SiteLanguage, now = Date.now(), timeZone = 'Europe/Berlin'): ContentItem[] {
  const results = source.mode === 'results';
  const english = language === 'en';
  const locale = english ? 'en-GB' : 'de-DE';
  if (!isClubTimeZone(timeZone)) timeZone = 'Europe/Berlin';
  const date = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', ...(results ? {} : { weekday: 'short' }), timeZone });
  const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone });
  return fixtures.filter(match => results ? match.status === 'final' : match.status === 'scheduled' && Date.parse(match.startsAt) >= now
    && (source.mode !== 'next-home' || match.home))
    .sort((a, b) => results ? b.startsAt.localeCompare(a.startsAt) : a.startsAt.localeCompare(b.startsAt))
    .slice(0, source.mode === 'next-home' ? 1 : source.limit)
    .map(match => {
      const names = match.home ? [match.team, match.opponent] : [match.opponent, match.team];
      const scores = match.home ? [match.ourScore, match.theirScore] : [match.theirScore, match.ourScore];
      const score = results && scores.every(value => value !== null) ? scores.join(english ? '–' : ':') : '';
      const venue = match.home ? english ? 'Home' : 'Heimspiel' : english ? 'Away' : 'Auswärtsspiel';
      return {
        id: match.id, title: names.join(english ? ' v ' : ' – '),
        meta: date.format(new Date(match.startsAt)) + (results ? '' : ' · ' + time.format(new Date(match.startsAt))),
        text: [score, match.venue, venue].filter(Boolean).join(' · '),
        ...(score ? { label: score } : {}),
      };
    });
}
