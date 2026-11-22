import preset from '../../../profiles/creator-post-planner.json';
import { CREATOR_TOOLS, type ContentItem, type CreatorTool } from '../types';

export const creatorToolLabels: Record<CreatorTool, string> = {
  planner: 'Ideen und Produktion',
  campaign: 'Kooperation und Angebot',
  merch: 'Merch-Drop',
  publishing: 'Post-Planer und Veröffentlichung',
};

export function creatorTool(item: ContentItem): CreatorTool | undefined {
  return item.creatorTool ?? CREATOR_TOOLS.find(tool => item.tags?.includes(tool));
}

export function createPostPlannerItem(id = 'post-planner'): ContentItem {
  return { ...structuredClone(preset), id } as ContentItem;
}

export function toolDetail(item: ContentItem, key: string, value: string): ContentItem {
  const details = [...(item.details ?? [])];
  const index = details.findIndex(detail => detail.startsWith(`${key}|`));
  if (index < 0) details.push(`${key}|${value}`);
  else details[index] = `${key}|${value}`;
  return { ...item, details };
}

export function postPlannerCopy(item: ContentItem) {
  const values: Record<string, string> = {};
  for (const entry of [...preset.details, ...(item.details ?? [])]) {
    const separator = entry.indexOf('|');
    if (separator > 0) values[entry.slice(0, separator)] = entry.slice(separator + 1);
  }
  return (key: string) => values[key] ?? '';
}

export interface DemoPost {
  id: string;
  title: string;
  artwork: string;
  caption: string;
  kind: 'image' | 'reel';
  day: number;
  time: string;
  needsReview: boolean;
}

export function parseDemoPosts(value: string): DemoPost[] | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.length > 6) return null;
    const ids = new Set<string>();
    for (const post of parsed) {
      if (!post || typeof post !== 'object' || Array.isArray(post)) return null;
      const p = post as Record<string, unknown>;
      if (typeof p.id !== 'string' || !p.id || p.id.length > 80 || ids.has(p.id)) return null;
      if (!['title', 'artwork', 'caption'].every(key => typeof p[key] === 'string' && (p[key] as string).length <= (key === 'caption' ? 2200 : 180))) return null;
      if (p.kind !== 'image' && p.kind !== 'reel') return null;
      if (!Number.isInteger(p.day) || (p.day as number) < 0 || (p.day as number) > 6) return null;
      if (typeof p.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(p.time) || typeof p.needsReview !== 'boolean') return null;
      ids.add(p.id);
    }
    return parsed as DemoPost[];
  } catch { return null; }
}

export function demoWeek(start: string) {
  const safe = /^\d{4}-\d{2}-\d{2}$/.test(start) && Number.isFinite(Date.parse(`${start}T12:00:00Z`)) ? start : '2026-11-02';
  return Array.from({ length: 7 }, (_, day) => {
    const date = new Date(`${safe}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + day);
    const format = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('de-DE', { ...options, timeZone: 'UTC' }).format(date);
    return { date: date.toISOString().slice(0, 10), short: format({ weekday: 'short' }), number: format({ day: '2-digit' }), full: format({ weekday: 'long', day: 'numeric', month: 'long' }), compact: format({ weekday: 'short', day: 'numeric', month: 'short' }) };
  });
}
