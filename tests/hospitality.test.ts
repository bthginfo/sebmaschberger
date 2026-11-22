import test from 'node:test';
import assert from 'node:assert/strict';
import { createSection, availableSectionLibrary } from '../src/lib/section-library';
import { projectPublicSiteConfig } from '../src/lib/public-projection';
import { selectMenuCategories, type RestaurantMenu } from '../src/lib/restaurant-menu/model';
import { emptyReservationSettings, availableReservations, decisionMessage, isWithinReservationWindow, type Booking } from '../src/lib/reservations/model';
import { reservationRequest, reservationsSchema } from '../src/lib/reservations/schema';
import type { SiteConfig } from '../src/lib/types';
import { seedContent } from '../src/data/seed';

const menu: RestaurantMenu = {
  enabled: true,
  categories: [{ id: 'drinks', name: 'Getränke', description: '', visible: true, items: [
    { id: 'wine', name: 'Riesling', description: '', details: '', visible: true, featured: false, prices: [{ id: 'glass', label: '0,1 l', cents: 650 }] },
    { id: 'sparkling', name: 'Crémant', description: '', details: '', visible: true, featured: true, prices: [] },
    { id: 'hidden', name: 'Nicht auf der Karte', description: '', details: '', visible: false, featured: true, prices: [] },
  ] }],
};

test('menu placements read the same visible entries, and feature orders highlighted entries first', () => {
  assert.deepEqual(selectMenuCategories(menu, { layout: 'full' })[0].items.map(item => item.id), ['wine', 'sparkling']);
  assert.equal(selectMenuCategories(menu, { layout: 'feature', limitPerCategory: 1 })[0].items[0].id, 'sparkling');
  assert.deepEqual(selectMenuCategories(menu, { layout: 'compact', categoryIds: ['removed'] }), []);
  assert.equal(menu.categories[0].items.length, 3);
  assert.equal(menu.categories[0].items[0].id, 'wine');
});

test('public projection omits hidden menu items and all internal table and closure data', () => {
  const config = { ...seedContent.config, modules: { restaurantMenu: menu, reservations: { enabled: true, settings: emptyReservationSettings } } };
  const published = projectPublicSiteConfig(config);
  assert.equal(published.modules?.restaurantMenu?.categories[0].items.length, 2);
  assert.deepEqual(published.modules?.reservations, { enabled: true });
  assert.deepEqual(projectPublicSiteConfig(config, false).modules?.restaurantMenu?.categories, []);
});

test('optional hospitality blocks activate separately and preserve their defaults', () => {
  const config: SiteConfig = { ...seedContent.config, modules: undefined };
  assert(!availableSectionLibrary(config).some(entry => entry.type === 'restaurant-menu' || entry.type === 'reservation'));
  config.modules = { restaurantMenu: menu };
  assert(availableSectionLibrary(config).some(entry => entry.type === 'restaurant-menu'));
  assert(!availableSectionLibrary(config).some(entry => entry.type === 'reservation'));
  assert.deepEqual(createSection('restaurant-menu').content.restaurantMenu, { layout: 'full' });
  assert.deepEqual(createSection('reservation').content.reservation, { layout: 'card' });
});

const settings = {
  ...emptyReservationSettings,
  windows: [{ id: 'fri', day: 'fri' as const, start: '17:30', end: '22:00', duration: 90 }],
  tables: [{ id: 'large', name: 'Groß', capacity: 4, active: true }, { id: 'small', name: 'Klein', capacity: 2, active: true }],
};
const now = new Date('2026-11-13T14:00:00Z');
const date = '2026-11-13';
const pending: Booking = {
  id: 'existing', date, time: '18:00', party: 2, name: 'Test', email: 'test@example.invalid', note: '',
  tableId: 'small', tableName: 'Klein', duration: 90, status: 'pending', createdAt: now.toISOString(),
  holdUntil: '2026-11-13T16:30:00Z', version: 1,
};

test('overlapping holds reserve an individual table and a released hold restores it', () => {
  const slots = availableReservations(settings, [pending], date, 2, now);
  assert.equal(slots.find(slot => slot.time === '17:30')?.table.id, 'large');
  assert.equal(slots.find(slot => slot.time === '19:00')?.table.id, 'large');
  assert.equal(slots.find(slot => slot.time === '19:30')?.table.id, 'small');
  assert.equal(slots.at(-1)?.time, '20:30');
  assert.equal(availableReservations(settings, [{ ...pending, holdUntil: now.toISOString() }], date, 2, now)[0].table.id, 'small');
});

test('closures, local time, oversized groups and overlap validation constrain bookings', () => {
  assert.deepEqual(availableReservations(settings, [], '2026-11-16', 2, now), []);
  assert.deepEqual(availableReservations(settings, [], date, 5, now), []);
  assert.deepEqual(availableReservations({ ...settings, closures: [{ id: 'private', from: date, to: date, name: 'Closed' }] }, [], date, 2, now), []);
  assert.equal(availableReservations(settings, [], date, 2, new Date('2026-11-13T16:00:00Z'))[0].time, '18:00');
  assert.equal(reservationsSchema.safeParse({ enabled: true, settings: { ...settings, windows: [...settings.windows, { ...settings.windows[0], id: 'overlap' }] } }).success, false);
});

test('the confirmed time must still fit a published booking window and keeps the guest language', () => {
  assert.equal(isWithinReservationWindow(settings, date, '20:30', 90), true);
  assert.equal(isWithinReservationWindow(settings, date, '20:31', 90), false);
  assert.equal(isWithinReservationWindow({ ...settings, windows: [] }, date, '20:30', 90), false);
  const input = { date, time: '18:00', party: 2, name: 'Test', email: 'test@example.invalid', requestId: '13ddf8cb-bf4a-4f90-bb61-d22f82b487ca' };
  assert.equal(reservationRequest.parse(input).language, 'de');
  assert.equal(reservationRequest.parse({ ...input, language: 'en' }).language, 'en');
  assert.match(decisionMessage({ ...pending, status: 'confirmed', language: 'en' }, 'Test').text, /2 guests/);
  assert.match(decisionMessage({ ...pending, status: 'confirmed' }, 'Test').text, /2 Personen/);
});
