import 'server-only';
import { isDeepStrictEqual } from 'node:util';
import { AppError, getRecord, mutateRecord } from '@/lib/db';
import { availableReservations, decisionMessage, fittingTables, isWithinReservationWindow, minutes, reservationClock, type Booking, type ReservationSettings } from '@/lib/reservations/model';
import type { reservationDecision, reservationRequest } from '@/lib/reservations/schema';
import type { z } from 'zod';
import { sendReservationMail } from '@/lib/mail';

export const reservationCollection = 'reservations-by-date';
export type BookingDay = { bookings: Booking[] } | Booking[];
export function dayBookings(day: BookingDay | null): Booking[] {
  return Array.isArray(day) ? day : day?.bookings ?? [];
}

export function bookingsOn(date: string) {
  return getRecord<BookingDay>(reservationCollection, date).then(dayBookings);
}

export async function requestBooking(input: z.output<typeof reservationRequest>, settings: ReservationSettings, now: Date) {
  const { requestId, ...guest } = input;
  await mutateRecord<BookingDay>(reservationCollection, guest.date, { bookings: [] }, day => {
    const bookings = dayBookings(day);
    const prior = bookings.find(booking => booking.id === requestId);
    if (prior) {
      const previousGuest = { date: prior.date, time: prior.time, party: prior.party, name: prior.name, email: prior.email, note: prior.note, language: prior.language ?? 'de' };
      if (!isDeepStrictEqual(previousGuest, guest)) throw new AppError('Diese Anfrage wurde bereits erfasst.', 409);
      return day;
    }
    if (bookings.length >= 1500) throw new AppError('Für dieses Datum sind keine weiteren Online-Anfragen möglich.', 409);
    const slot = availableReservations(settings, bookings, guest.date, guest.party, now).find(entry => entry.time === guest.time);
    if (!slot) throw new AppError('Dieser Termin ist nicht mehr verfügbar. Bitte wählen Sie eine neue Uhrzeit.', 409);
    const booking: Booking = {
      ...guest, id: requestId, tableId: slot.table.id, tableName: slot.table.name, duration: slot.duration,
      status: 'pending', createdAt: now.toISOString(), holdUntil: new Date(now.getTime() + settings.holdHours * 3600000).toISOString(), version: 1,
    };
    return { bookings: [...bookings, booking] };
  });
}

export async function decideBooking(input: z.output<typeof reservationDecision>, settings: ReservationSettings, now: Date, brand: string, emailReady: boolean) {
  const { id, date, version, action } = input;
  const at = now.toISOString();
  const saved = await mutateRecord<BookingDay>(reservationCollection, date, { bookings: [] }, day => {
    const entries = dayBookings(day);
    const current = entries.find(booking => booking.id === id);
    if (!current) throw new AppError('Diese Reservierung wurde nicht gefunden.', 404);
    if (current.version !== version) throw new AppError('Die Reservierung wurde geändert. Bitte laden Sie die Liste neu.', 409);
    const next = { ...current, version: current.version + 1 };
    if (action === 'retry-email') {
      const stuck = current.delivery?.status === 'sending' && now.getTime() - Date.parse(current.delivery.at) > 600000;
      if (!emailReady || current.status === 'pending' || current.delivery?.status === 'sent' || current.delivery?.status === 'sending' && !stuck) throw new AppError('Die Nachricht kann derzeit nicht erneut gesendet werden.', 409);
    } else {
      if (action === 'cancel' ? current.status !== 'confirmed' : current.status !== 'pending') throw new AppError('Der Status der Reservierung hat sich geändert.', 409);
      if (current.delivery?.status === 'sending' && now.getTime() - Date.parse(current.delivery.at) <= 600000) throw new AppError('Die letzte Nachricht wird noch gesendet. Bitte warten Sie kurz.', 409);
      if (action === 'confirm') {
        const clock = reservationClock(now, settings.timeZone);
        const started = date < clock.date || date === clock.date && minutes(current.time) <= clock.time;
        if (started || settings.closures.some(closure => date >= closure.from && date <= closure.to) || !isWithinReservationWindow(settings, date, current.time, current.duration)) throw new AppError('Für diesen Termin ist keine Zusage mehr möglich.', 409);
        const tables = fittingTables(settings, entries, current.party, minutes(current.time), current.duration, now, id);
        const table = tables.find(candidate => candidate.id === current.tableId) ?? tables[0];
        if (!table) throw new AppError('Für diesen Zeitraum ist kein passender Tisch frei.', 409);
        next.tableId = table.id;
        next.tableName = table.name;
      }
      next.status = action === 'confirm' ? 'confirmed' : action === 'decline' ? 'declined' : 'cancelled';
      next.decidedAt = at;
    }
    next.delivery = { status: emailReady ? 'sending' : 'unconfigured', at };
    return { bookings: entries.map(booking => booking.id === id ? next : booking) };
  });

  const next = dayBookings(saved).find(booking => booking.id === id)!;
  if (!emailReady) return next;
  let delivery: 'sent' | 'failed' = 'failed';
  try {
    await sendReservationMail({ to: next.email, ...decisionMessage(next, brand) });
    delivery = 'sent';
  } catch {
    // The decision remains valid if the message provider is temporarily unavailable.
  }
  const delivered = await mutateRecord<BookingDay>(reservationCollection, date, { bookings: [] }, day => ({
    bookings: dayBookings(day).map(booking => booking.id === id && booking.version === next.version
      ? { ...booking, delivery: { status: delivery, at: new Date().toISOString() } }
      : booking),
  }));
  return dayBookings(delivered).find(booking => booking.id === id) ?? next;
}
