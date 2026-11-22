import { PUBLICATION_LABELS, type PublicationRecord } from './model';
import { localWallTime } from './time';

export type PlannerView = 'week' | 'month' | 'list';
export type PlannerScope = 'all' | 'planned' | 'drafts' | 'attention' | 'done';
export const PLANNER_SCOPES: {key: PlannerScope; label: string}[] = [
 {key:'all',label:'Alle'}, {key:'planned',label:'Geplant'}, {key:'drafts',label:'Entwürfe'},
 {key:'attention',label:'Prüfen'}, {key:'done',label:'Erledigt'}
];
/** Date-only calendar arithmetic uses UTC carriers; real instants always use the chosen zone. */
export function calendarToday(zone: string, now = new Date()): string {
 return localWallTime(now.toISOString(), zone).slice(0,10);
}
function carrier(key: string): Date {
 if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) throw new Error('Ungültiges Kalenderdatum.');
 const date = new Date(key + 'T12:00:00Z');
 if (Number.isNaN(date.getTime()) || date.toISOString().slice(0,10) !== key) throw new Error('Ungültiges Kalenderdatum.');
 return date;
}
export function calendarDays(anchor: string, view: PlannerView): string[] {
 const day = carrier(anchor);
 if (view === 'month') day.setUTCDate(1);
 if (view !== 'list') day.setUTCDate(day.getUTCDate() - (day.getUTCDay() + 6) % 7);
 return Array.from({length:view === 'month' ? 42 : view === 'list' ? 1 : 7}, (_, index) => {
  const next = new Date(day); next.setUTCDate(day.getUTCDate() + index); return next.toISOString().slice(0,10);
 });
}
export function moveCalendar(anchor: string, direction: number, view: PlannerView): string {
 const date = carrier(anchor);
 if (view === 'month') { date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth()+direction); }
 else date.setUTCDate(date.getUTCDate()+direction*7);
 return date.toISOString().slice(0,10);
}
export function calendarLabel(anchor: string, view: PlannerView): string {
 const first = calendarDays(anchor,view)[0];
 if (view === 'month') return new Intl.DateTimeFormat('de-DE',{month:'long',year:'numeric',timeZone:'UTC'}).format(carrier(anchor));
 if (view === 'list') return 'Alle Beiträge';
 const end = calendarDays(anchor,view)[6];
 return new Intl.DateTimeFormat('de-DE',{day:'numeric',timeZone:'UTC'}).format(carrier(first)) + ' – ' +
  new Intl.DateTimeFormat('de-DE',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(carrier(end));
}
export function dayLabel(key: string, long = false): string {
 return new Intl.DateTimeFormat('de-DE',{weekday:long?'long':'short',day:'numeric',month:'short',timeZone:'UTC'}).format(carrier(key));
}
export function publicationDay(item: PublicationRecord, zone: string): string | null {
 return item.scheduledAt ? localWallTime(item.scheduledAt,zone).slice(0,10) : null;
}
export function publicationTime(item: PublicationRecord, zone: string): string {
 return item.scheduledAt ? new Intl.DateTimeFormat('de-DE',{hour:'2-digit',minute:'2-digit',timeZone:zone}).format(new Date(item.scheduledAt)) : 'Ohne Termin';
}
export function presentation(item: PublicationRecord): {label:string;tone:string;scope:PlannerScope} {
 if (['failed','needs_review','awaiting_platform'].includes(item.status) || item.process.lastError)
  return {label:['failed','needs_review','awaiting_platform'].includes(item.status)?PUBLICATION_LABELS[item.status]:'Prüfen',tone:'attention',scope:'attention'};
 if (item.status === 'scheduling' && item.approval) return {label:'Freigegeben',tone:'planned',scope:'planned'};
 if (['scheduled','processing','manual_planned'].includes(item.status)) return {label:PUBLICATION_LABELS[item.status],tone:'planned',scope:'planned'};
 if (['published','manual_completed'].includes(item.status)) return {label:PUBLICATION_LABELS[item.status],tone:'done',scope:'done'};
 if (['draft','prepared'].includes(item.status)) return {label:PUBLICATION_LABELS[item.status],tone:'draft',scope:'drafts'};
 return {label:PUBLICATION_LABELS[item.status],tone:'neutral',scope:'all'};
}
export function plannerMatches(item: PublicationRecord, query: string, scope: PlannerScope): boolean {
 if (scope !== 'all' && presentation(item).scope !== scope) return false;
 const text = [item.source.title,item.caption,item.source.brandLabel,item.targetLabel || ''].join(' ').toLocaleLowerCase('de');
 return text.includes(query.trim().toLocaleLowerCase('de'));
}
export function plannerCounts(entries: PublicationRecord[]): Record<PlannerScope,number> {
 const counts:Record<PlannerScope,number> = {all:entries.length,planned:0,drafts:0,attention:0,done:0};
 for (const item of entries) { const scope = presentation(item).scope; if(scope !== 'all') counts[scope]++; }
 return counts;
}
export function coverMedia(item: PublicationRecord) {
 return item.carousel ? item.mediaItems?.find(media => media.slideIndex === 0) || item.media : item.media;
}

/** Presentation only: completed records stay available without becoming new ideas. */
export function undatedPlannerGroups(entries: PublicationRecord[]): {active:PublicationRecord[];closed:PublicationRecord[]} {
 const active:PublicationRecord[]=[],closed:PublicationRecord[]=[];
 for (const item of entries) {
  if (item.scheduledAt) continue;
  const finished=['published','manual_completed','cancelled'].includes(item.status)&&!item.process.lastError;
  (finished?closed:active).push(item);
 }
 return {active,closed};
}
