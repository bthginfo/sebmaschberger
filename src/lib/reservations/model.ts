export const RESERVATION_LAYOUTS = ['inline', 'card', 'split'] as const;
export const RESERVATION_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type ReservationLayout = typeof RESERVATION_LAYOUTS[number];
export type ReservationDay = typeof RESERVATION_DAYS[number];
export type ReservationTable = { id: string; name: string; capacity: number; active: boolean };
export type ReservationWindow = { id: string; day: ReservationDay; start: string; end: string; duration: number };
export type ReservationClosure = { id: string; from: string; to: string; name: string };
export type ReservationSettings = {
  timeZone: string;
  interval: number;
  minNotice: number;
  advanceDays: number;
  holdHours: number;
  tables: ReservationTable[];
  windows: ReservationWindow[];
  closures: ReservationClosure[];
};
export type ReservationsModule = { enabled: boolean; settings?: ReservationSettings };
export type ReservationStatus = 'pending' | 'confirmed' | 'declined' | 'cancelled';
export type ReservationDelivery = { status: 'unconfigured' | 'sending' | 'sent' | 'failed'; at: string };
export type Booking = {
  id: string; date: string; time: string; party: number; name: string; email: string; note: string; language?: 'de' | 'en';
  tableId: string; tableName: string; duration: number; status: ReservationStatus;
  createdAt: string; holdUntil: string; version: number; decidedAt?: string; delivery?: ReservationDelivery;
};

export const emptyReservationSettings: ReservationSettings = {
  timeZone: 'Europe/Berlin', interval: 30, minNotice: 60, advanceDays: 45, holdHours: 12, tables: [], windows: [], closures: [],
};

export const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
export const formatTime = (value: number) => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;

export function datePlus(date: string, days: number) {
  const value = new Date(date + 'T00:00:00Z');
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function validReservationDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date + 'T00:00:00Z'))) return false;
  return datePlus(date, 0) === date;
}

export function reservationClock(now: Date, timeZone: string) {
  const fields = new Intl.DateTimeFormat('en-GB', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const get = (field: string) => fields.find(part => part.type === field)?.value;
  const date = `${get('year')}-${get('month')}-${get('day')}`;
  const time = Number(get('hour')) * 60 + Number(get('minute'));
  return { date, time };
}

function businessDay(date: string): ReservationDay {
  return RESERVATION_DAYS[(new Date(date + 'T00:00:00Z').getUTCDay() + 6) % 7];
}

export function isWithinReservationWindow(settings: ReservationSettings, date: string, time: string, duration: number) {
  const day = businessDay(date);
  const start = minutes(time);
  return settings.windows.some(window => window.day === day && start >= minutes(window.start) && start + duration <= minutes(window.end));
}

export function reservationRange(settings: ReservationSettings, now: Date) {
  const { date } = reservationClock(now, settings.timeZone);
  return {
    minDate: date,
    maxDate: datePlus(date, settings.advanceDays),
    maxParty: Math.max(0, ...settings.tables.filter(table => table.active).map(table => table.capacity)),
  };
}

export function isPendingExpired(booking: Booking, now: Date) {
  return booking.status === 'pending' && booking.holdUntil <= now.toISOString();
}

export function fittingTables(settings: ReservationSettings, bookings: Booking[], party: number, start: number, duration: number, now: Date, ignoreId?: string) {
  const occupied = new Set(bookings.filter(booking => {
    if (booking.id === ignoreId || booking.status !== 'confirmed' && (booking.status !== 'pending' || isPendingExpired(booking, now))) return false;
    const other = minutes(booking.time);
    return start < other + booking.duration && other < start + duration;
  }).map(booking => booking.tableId));
  return settings.tables.filter(table => table.active && table.capacity >= party && !occupied.has(table.id))
    .sort((a, b) => a.capacity - b.capacity);
}

export function availableReservations(settings: ReservationSettings, bookings: Booking[], date: string, party: number, now: Date) {
  const { date: today, time } = reservationClock(now, settings.timeZone);
  if (date < today || date > datePlus(today, settings.advanceDays) || settings.closures.some(closure => date >= closure.from && date <= closure.to)) return [];
  const cutoff = Math.ceil((Date.parse(date) - Date.parse(today)) / 86400000) * 1440;
  const results: { time: string; duration: number; table: ReservationTable }[] = [];
  for (const window of settings.windows.filter(entry => entry.day === businessDay(date))) {
    for (let start = minutes(window.start); start + window.duration <= minutes(window.end); start += settings.interval) {
      if (cutoff + start < time + settings.minNotice) continue;
      const [table] = fittingTables(settings, bookings, party, start, window.duration, now);
      if (table) results.push({ time: formatTime(start), duration: window.duration, table });
    }
  }
  return results.sort((a, b) => a.time.localeCompare(b.time));
}

export function decisionMessage(booking: Booking, brand: string, language: 'de' | 'en' = booking.language ?? 'de') {
  const date = new Intl.DateTimeFormat(language === 'de' ? 'de-DE' : 'en-GB', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(booking.date + 'T00:00:00Z'));
  const de = language === 'de';
  const subject = de ? `Ihre Reservierung · ${brand}` : `Your reservation · ${brand}`;
  const intro = de ? `Hallo ${booking.name},` : `Hello ${booking.name},`;
  const detail = de ? `${date} um ${booking.time} Uhr für ${booking.party} ${booking.party === 1 ? 'Person' : 'Personen'}` : `${date} at ${booking.time} for ${booking.party} ${booking.party === 1 ? 'guest' : 'guests'}`;
  const status = booking.status === 'confirmed'
    ? de ? `Ihr Tisch am ${detail} ist reserviert. Wir freuen uns auf Ihren Besuch!` : `Your table on ${detail} is confirmed. We look forward to seeing you!`
    : booking.status === 'cancelled'
      ? de ? `Ihre Reservierung am ${detail} wurde storniert.` : `Your reservation on ${detail} has been cancelled.`
      : de ? `Wir können Ihnen am ${detail} leider keinen Tisch anbieten. Gerne können Sie einen anderen Termin anfragen.` : `We cannot offer you a table on ${detail}. You are welcome to request another time.`;
  return { subject, text: [intro, status, brand].join('\n\n') };
}
