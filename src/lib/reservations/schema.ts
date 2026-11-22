import { z } from 'zod';
import { RESERVATION_DAYS, RESERVATION_LAYOUTS, minutes, validReservationDate } from './model';

const id = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
const name = z.string().trim().min(1).max(100);
const date = z.string().refine(validReservationDate, 'Bitte wählen Sie ein gültiges Datum.');
const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const endTime = z.union([time, z.literal('24:00')]);
const party = z.number().int().min(1).max(24);
const timeZone = z.string().min(1).max(80).refine(value => {
  try { new Intl.DateTimeFormat('de', { timeZone: value }); return true; }
  catch { return false; }
}, 'Bitte eine gültige Zeitzone angeben.');

const table = z.object({ id, name, capacity: party, active: z.boolean() }).strict();
const window = z.object({ id, day: z.enum(RESERVATION_DAYS), start: time, end: endTime, duration: z.number().int().min(15).max(360) }).strict();
const closure = z.object({ id, from: date, to: date, name: z.string().trim().max(100) }).strict();

export const reservationsSchema = z.object({
  enabled: z.boolean(),
  settings: z.object({
    timeZone,
    interval: z.number().int().min(5).max(120),
    minNotice: z.number().int().min(0).max(1440),
    advanceDays: z.number().int().min(1).max(120),
    holdHours: z.number().int().min(1).max(48),
    tables: z.array(table).max(80),
    windows: z.array(window).max(42),
    closures: z.array(closure).max(100),
  }).strict().optional(),
}).strict().superRefine(({ settings }, ctx) => {
  if (!settings) return;
  for (const key of ['tables', 'windows', 'closures'] as const) {
    const entries = settings[key];
    if (new Set(entries.map(entry => entry.id)).size !== entries.length) ctx.addIssue({ code: 'custom', path: ['settings', key], message: 'Die IDs müssen eindeutig sein.' });
  }
  if (settings.closures.some(entry => entry.from > entry.to)) ctx.addIssue({ code: 'custom', path: ['settings', 'closures'], message: 'Ein Schließzeitraum endet vor seinem Beginn.' });
  for (const day of RESERVATION_DAYS) {
    const windows = settings.windows.filter(entry => entry.day === day).sort((a, b) => a.start.localeCompare(b.start));
    if (windows.some((entry, index) => minutes(entry.end) - minutes(entry.start) < entry.duration || index > 0 && windows[index - 1].end > entry.start)) {
      ctx.addIssue({ code: 'custom', path: ['settings', 'windows'], message: 'Ein Buchungsfenster ist zu kurz oder überschneidet sich mit einem anderen Fenster.' });
      break;
    }
  }
});

export const reservationPlacementSchema = z.object({ layout: z.enum(RESERVATION_LAYOUTS) }).strict();
export const slotQuery = z.object({ date, party: z.coerce.number().int().min(1).max(24) });
export const reservationRequest = z.object({
  date, time, party, name, email: z.email().max(254).transform(value => value.toLowerCase()),
  note: z.string().trim().max(700).optional().default(''), language: z.enum(['de', 'en']).optional().default('de'), requestId: z.uuid(),
}).strict();
export const reservationDecision = z.object({
  date, id: z.uuid(), version: z.number().int().min(1), action: z.enum(['confirm', 'decline', 'cancel', 'retry-email']),
}).strict();
export const reservationAdminQuery = z.object({ date: date.optional() });
