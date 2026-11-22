import { requireAdmin } from '@/lib/auth';
import { AppError, getDraftConfig, getPublishedConfig, getRecord, getSettings, rateLimit, recordsByKeyRange } from '@/lib/db';
import { handler, ipKey, json, readJson, sameOrigin } from '@/lib/http';
import { datePlus, emptyReservationSettings, reservationClock } from '@/lib/reservations/model';
import { smtpSetupId } from '@/lib/operations/smtp';
import { reservationAdminQuery, reservationDecision } from '@/lib/reservations/schema';
import { bookingsOn, dayBookings, decideBooking, reservationCollection, type BookingDay } from '@/lib/server/reservations';

export const runtime = 'nodejs';

function emailReady(settings: Awaited<ReturnType<typeof getSettings>>) {
  return Boolean(process.env.SMTP_ENABLED !== 'false' && settings.smtp.enabled && settings.smtp.host && settings.smtp.from);
}

export const GET = handler(async request => {
  await requireAdmin();
  const [draft, config, settings, smtpTest] = await Promise.all([
    getDraftConfig(), getPublishedConfig(), getSettings(),
    getRecord<{ setup: string }>('operation-checkpoints', 'smtp'),
  ]);
  const module = config.modules?.reservations ?? draft.modules?.reservations;
  if (!module) throw new AppError('Das Reservierungsmodul ist nicht eingerichtet.', 404);
  const query = reservationAdminQuery.parse(Object.fromEntries(new URL(request.url).searchParams));
  const today = reservationClock(new Date(), module.settings?.timeZone ?? emptyReservationSettings.timeZone).date;
  const date = query.date ?? today;
  const through = datePlus(today, 120);
  const bookings = query.date ? await bookingsOn(date) : (await recordsByKeyRange<BookingDay>(reservationCollection, today, through)).flatMap(dayBookings);
  bookings.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  const smtp = emailReady(settings);
  return json({ date, bookings, smtp, smtpVerified: smtp && smtpTest?.setup === smtpSetupId(settings.smtp) });
});

export const POST = handler(async request => {
  sameOrigin(request);
  await requireAdmin();
  await rateLimit(ipKey(request, 'reservations-admin'), 45, 60);
  const input = reservationDecision.parse(await readJson(request, 4000));
  const [config, settings] = await Promise.all([getPublishedConfig(), getSettings()]);
  if (!config.modules?.reservations) throw new AppError('Das Reservierungsmodul ist nicht eingerichtet.', 404);
  const booking = await decideBooking(input, config.modules.reservations.settings ?? emptyReservationSettings, new Date(), config.name, emailReady(settings));
  return json({ booking });
});
