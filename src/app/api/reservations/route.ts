import { AppError, getPublishedConfig, rateLimit } from '@/lib/db';
import { handler, ipKey, json, readJson, sameOrigin } from '@/lib/http';
import { availableReservations, emptyReservationSettings, reservationRange } from '@/lib/reservations/model';
import { reservationRequest, slotQuery } from '@/lib/reservations/schema';
import { bookingsOn, requestBooking } from '@/lib/server/reservations';

export const runtime = 'nodejs';

async function publicSettings() {
  const module = (await getPublishedConfig()).modules?.reservations;
  return module?.enabled ? module.settings ?? emptyReservationSettings : undefined;
}

export const GET = handler(async request => {
  const settings = await publicSettings();
  if (!settings) return json({ enabled: false });
  const now = new Date();
  const range = reservationRange(settings, now);
  const config = { enabled: range.maxParty > 0 && settings.windows.length > 0, ...range };
  const params = new URL(request.url).searchParams;
  if (!params.has('date') && !params.has('party')) return json(config);
  const { date, party } = slotQuery.parse({ date: params.get('date'), party: params.get('party') });
  if (date < range.minDate || date > range.maxDate || party > range.maxParty) return json({ ...config, slots: [] });
  const slots = availableReservations(settings, await bookingsOn(date), date, party, now).map(slot => slot.time);
  return json({ ...config, slots });
});

export const POST = handler(async request => {
  sameOrigin(request);
  await rateLimit(ipKey(request, 'reservations-request'), 8, 900);
  const settings = await publicSettings();
  if (!settings) throw new AppError('Online-Reservierungen sind derzeit nicht verfügbar.', 404);
  const input = reservationRequest.parse(await readJson(request, 8000));
  await requestBooking(input, settings, new Date());
  return json({ status: 'pending' }, 201);
});
