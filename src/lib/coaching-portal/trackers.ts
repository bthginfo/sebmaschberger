import 'server-only';
import { randomBytes, randomUUID } from 'node:crypto';
import { AppError, getSettings } from '@/lib/db';
import { decrypt, digest, encrypt } from '@/lib/security';
import { addDays, localDate, metrics, providers, today } from './model';
import type { ActorView, DeviceState, Metrics, Provider } from './model';
import { ownerOnly } from './access';
import { addMetrics, clearMetrics, getProgram, ownTrackerAccount } from './program';
import { personById } from './access';
import { change, list, read, remove, save } from './store';

const details = {
  google: { authorize: 'https://accounts.google.com/o/oauth2/v2/auth', token: 'https://oauth2.googleapis.com/token',
    scope: 'https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly https://www.googleapis.com/auth/googlehealth.sleep.readonly' },
  oura: { authorize: 'https://developer.ouraring.com/authorize', token: 'https://api.ouraring.com/oauth/token', scope: 'daily' },
  withings: { authorize: 'https://account.withings.com/oauth2_user/authorize2', token: 'https://wbsapi.withings.net/v2/oauth2', scope: 'user.activity' },
} satisfies Record<Provider, {authorize: string; token: string; scope: string}>;
const settingsBucket = 'device-config', connectionBucket = 'device-connections';
const connectionId = (user: string, provider: Provider) => user + ':' + provider;
type Credentials = { id: string; secret: string };
type Tokens = { access: string; refresh: string; expires: number };
type Connection = { user: string; provider: Provider; encrypted: string; lastSync: string | null; lease: string; until: number; identity: string };
type OAuthState = { user: string; provider: Provider; expires: number; redirect: string; verifier: string; used: boolean };

async function config(provider: Provider): Promise<Credentials | null> {
  const env = 'PORTAL_' + provider.toUpperCase();
  const id = process.env[env + '_CLIENT_ID'], secret = process.env[env + '_CLIENT_SECRET'];
  if (id && secret) return { id, secret };
  const stored = await read<{ id: string; secret: string }>(settingsBucket, provider);
  return stored ? { id: stored.id, secret: decrypt(stored.secret) } : null;
}
export async function providerSettings(actor: ActorView) {
  ownerOnly(actor);
  const { siteUrl } = await getSettings();
  return Promise.all(providers.options.map(async provider => {
    const value = await config(provider);
    return { provider, available: Boolean(value), clientId: value?.id ?? '', callback: new URL('/api/coaching-portal/device-callback/' + provider, siteUrl).href };
  }));
}
export async function updateProvider(actor: ActorView, provider: Provider, id: string, secret: string) {
  ownerOnly(actor);
  const previous = await read<{ id: string; secret: string }>(settingsBucket, provider);
  const ciphertext = secret ? encrypt(secret) : previous?.secret;
  if (!ciphertext || (!secret && previous?.id !== id)) throw new AppError('Trage für diese Client-ID das passende Client-Geheimnis ein.');
  await save(settingsBucket, provider, { id, secret: ciphertext });
}
export async function deviceStatus(user: string): Promise<DeviceState[]> {
  return Promise.all(providers.options.map(async provider => {
    const [setup, saved] = await Promise.all([config(provider), read<Connection>(connectionBucket, connectionId(user, provider))]);
    return { provider, available: Boolean(setup), connected: Boolean(saved), lastSync: saved?.lastSync ?? null };
  }));
}
export async function startDevice(actor: ActorView, provider: Provider) {
  const user = await ownTrackerAccount(actor);
  const setup = await config(provider);
  if (!setup) throw new AppError('Die Schnittstelle wird vom Coaching-Team eingerichtet.', 503);
  const { siteUrl } = await getSettings();
  const redirect = new URL('/api/coaching-portal/device-callback/' + provider, siteUrl).href;
  const state = randomBytes(32).toString('base64url'), verifier = randomBytes(32).toString('base64url');
  await save<OAuthState>('device-oauth', digest(state), { user: user.id, provider, expires: Date.now() + 10 * 60_000, redirect, verifier, used: false });
  const target = new URL(details[provider].authorize);
  const values: Record<string, string> = { client_id: setup.id, redirect_uri: redirect, scope: details[provider].scope, state, response_type: 'code' };
  if (provider === 'google') Object.assign(values, {
    access_type: 'offline', prompt: 'consent', code_challenge_method: 'S256',
    code_challenge: Buffer.from(digest(verifier), 'hex').toString('base64url')
  });
  target.search = new URLSearchParams(values).toString();
  return target.href;
}

function obj(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function count(value: unknown) {
  if (value === null || value === undefined || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : undefined;
}
async function external(url: string | URL, init: RequestInit = {}) {
  let response: Response;
  try { response = await fetch(url, { ...init, redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(12000) }); }
  catch { throw new AppError('Der Geräteanbieter ist gerade nicht erreichbar.', 502); }
  if (!response.ok) throw new AppError('Der Geräteanbieter konnte den Zugriff nicht bestätigen. Verbinde das Gerät bei Bedarf erneut.', 502);
  return obj(await response.json());
}
async function obtain(provider: Provider, setup: Credentials, grant: Record<string, string>, previous = ''): Promise<Tokens> {
  const params = new URLSearchParams({ client_id: setup.id, client_secret: setup.secret, ...grant });
  if (provider === 'withings') params.set('action', 'requesttoken');
  const res = await external(details[provider].token, { method: 'POST', body: params });
  if (provider === 'withings' && res.status !== 0) throw new AppError('Withings konnte den Zugriff nicht bestätigen.', 502);
  const body = provider === 'withings' ? obj(res.body) : res;
  if (typeof body.access_token !== 'string') throw new AppError('Der Geräteanbieter hat keine Verbindung bestätigt.', 502);
  return { access: body.access_token, refresh: typeof body.refresh_token === 'string' ? body.refresh_token : previous,
    expires: Date.now() + (count(body.expires_in) ?? 3600) * 1000 };
}
export async function completeDevice(actor: ActorView, provider: Provider, state: string, code: string) {
  const user = await ownTrackerAccount(actor);
  const key = digest(state);
  const setup = await config(provider);
  if (!setup) throw new AppError('Diese Schnittstelle ist gerade nicht eingerichtet.', 503);
  const pending = await change<OAuthState | null>('device-oauth', key, null, value => {
    if (!value || value.used || value.user !== user.id || value.provider !== provider || value.expires < Date.now()) {
      throw new AppError('Die Gerätefreigabe ist abgelaufen. Starte sie erneut.', 409);
    }
    return { ...value, used: true };
  });
  try {
    const tokens = await obtain(provider, setup, { grant_type: 'authorization_code', code, redirect_uri: pending!.redirect,
      ...(provider === 'google' ? { code_verifier: pending!.verifier } : {}) });
    await save<Connection>(connectionBucket, connectionId(user.id, provider), {
      user: user.id, provider, encrypted: encrypt(JSON.stringify(tokens)), lastSync: null, lease: '', until: 0, identity: randomUUID()
    });
  } finally { await remove('device-oauth', key); }
}

function civilDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return { date: { year, month, day }, time: {} };
}
function fromCivil(input: unknown) {
  const d = obj(obj(input).date);
  return [String(d.year), String(d.month).padStart(2, '0'), String(d.day).padStart(2, '0')].join('-');
}
function bearer(token: string) { return { Authorization: 'Bearer ' + token }; }
function row(date: unknown, values: Omit<Metrics, 'date'>): Metrics[] {
  const parsed = metrics.safeParse({ date, ...Object.fromEntries(Object.entries(values).filter(([,v]) => v !== undefined)) });
  return parsed.success ? [parsed.data] : [];
}
async function googleDays(token: string, from: string, end: string) {
  const get = (type: string) => external('https://health.googleapis.com/v4/users/me/dataTypes/' + type + '/dataPoints:dailyRollUp', {
    method: 'POST', headers: { ...bearer(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ range: { start: civilDate(from), end: civilDate(end) }, windowSizeDays: 1 }),
  });
  const steps = await get('steps');
  // The API's civil-day rollup reconciles multiple devices before returning the total.
  const results = array(steps.rollupDataPoints).flatMap(entry => {
    const data = obj(entry);
    return row(fromCivil(data.civilStartTime), { steps: count(obj(data.steps).countSum) });
  });
  const sleepEndpoint = 'https://health.googleapis.com/v4/users/me/dataTypes/sleep/dataPoints:reconcile';
  const filter = 'sleep.interval.civil_end_time >= "' + from + '" AND sleep.interval.civil_end_time < "' + end + '"';
  const minutes = new Map<string, number>();
  let pageToken = '';
  for (let page = 0; page < 6; page++) {
    const query = new URLSearchParams({ filter, pageSize: '25', ...(pageToken ? { pageToken } : {}) });
    const batch = await external(sleepEndpoint + '?' + query, { headers: bearer(token) });
    for (const entry of array(batch.dataPoints)) {
      const value = obj(obj(entry).sleep), interval = obj(value.interval);
      const timestamp = Date.parse(String(interval.endTime ?? ''));
      const offset = /^(-?\d+)s$/u.exec(String(interval.endUtcOffset ?? ''));
      if (!Number.isFinite(timestamp)) continue;
      const date = new Date(timestamp + Number(offset?.[1] ?? 0) * 1000).toISOString().slice(0, 10);
      const asleep = count(obj(value.summary).minutesAsleep);
      if (asleep !== undefined) minutes.set(date, (minutes.get(date) ?? 0) + asleep);
    }
    pageToken = typeof batch.nextPageToken === 'string' ? batch.nextPageToken : '';
    if (!pageToken) break;
  }
  return results.concat([...minutes].flatMap(([date, sleep]) => row(date, { sleep: Math.min(1440,sleep) })));
}
async function ouraDays(token: string, from: string, end: string) {
  const get = (type: string) => external('https://api.ouraring.com/v2/usercollection/' + type + '?' +
    new URLSearchParams({ start_date: from, end_date: end }), { headers: bearer(token) });
  const [activity, sleep] = await Promise.all([get('daily_activity'), get('sleep')]);
  const durations = new Map<string, number>();
  for (const entry of array(sleep.data)) {
    const value = obj(entry);
    const parsed = localDate.safeParse(value.day);
    const seconds = count(value.total_sleep_duration);
    if (parsed.success && seconds !== undefined) durations.set(parsed.data, (durations.get(parsed.data) ?? 0) + seconds);
  }
  return array(activity.data).flatMap(entry => {
    const data = obj(entry);
    return row(data.day, { steps: count(data.steps) });
  }).concat([...durations].flatMap(([date, seconds]) => row(date, { sleep: Math.min(1440, Math.round(seconds / 60)) })));
}
async function withingsDays(token: string, from: string, end: string) {
  const get = async (endpoint: string, action: string, extra: Record<string, string> = {}) => {
    const result = await external('https://wbsapi.withings.net/v2/' + endpoint, {
      method: 'POST', headers: bearer(token), body: new URLSearchParams({ action, startdateymd: from, enddateymd: end, ...extra }),
    });
    if (result.status !== 0) throw new AppError('Withings konnte die Daten gerade nicht abrufen.', 502);
    return obj(result.body);
  };
  const [activity, sleep] = await Promise.all([get('measure', 'getactivity'),
    get('sleep', 'getsummary', { data_fields: 'deepsleepduration,lightsleepduration,remsleepduration' })]);
  return array(activity.activities).flatMap(entry => {
    const data = obj(entry);
    return row(data.date, { steps: count(data.steps) });
  }).concat(array(sleep.series).flatMap(entry => {
    const data = obj(entry), detail = obj(data.data);
    const parts = ['deepsleepduration', 'lightsleepduration', 'remsleepduration'].map(key => count(detail[key]));
    return parts.some(value => value !== undefined)
      ? row(data.date, { sleep: Math.round(parts.reduce<number>((sum, value) => sum + (value ?? 0), 0) / 60) }) : [];
  }));
}

export async function syncConnection(user: string, provider: Provider, days = 14) {
  const id = connectionId(user, provider), lease = randomUUID();
  const setup = await config(provider);
  if (!setup) throw new AppError('Die Schnittstelle ist gerade nicht eingerichtet.', 503);
  const taken = await change<Connection | null>(connectionBucket, id, null, current => {
    if (!current) throw new AppError('Verbinde zuerst dein Gerät.', 409);
    if (current.until > Date.now()) throw new AppError('Die Synchronisierung läuft bereits.', 409);
    return { ...current, until: Date.now() + 70_000, lease };
  });
  async function commit(update: Partial<Connection>) {
    await change<Connection | null>(connectionBucket, id, null, current => {
      if (!current || current.lease !== lease) throw new AppError('Die Geräteverbindung wurde geändert.', 409);
      return { ...current, ...update };
    });
  }
  let tokens = JSON.parse(decrypt(taken!.encrypted)) as Tokens;
  try {
    if (tokens.expires < Date.now() + 75_000) {
      if (!tokens.refresh) throw new AppError('Verbinde das Gerät erneut.', 409);
      tokens = await obtain(provider, setup, { grant_type: 'refresh_token', refresh_token: tokens.refresh }, tokens.refresh);
      await commit({ encrypted: encrypt(JSON.stringify(tokens)) });
    }
    const end = addDays(today(), 1), from = addDays(end, -days);
    const values = await ({ google: googleDays, oura: ouraDays, withings: withingsDays }[provider])(tokens.access, from, end);
    await commit({});
    await addMetrics(user, provider, values);
    const lastSync = new Date().toISOString();
    await commit({ lastSync, until: 0, lease: '' });
    return { count: new Set(values.map(value => value.date)).size, lastSync };
  } catch (error) {
    await commit({ until: 0, lease: '' }).catch(() => {});
    throw error;
  }
}
export async function disconnect(actor: ActorView, provider: Provider, erase: boolean) {
  const person = await ownTrackerAccount(actor);
  await remove(connectionBucket, connectionId(person.id, provider));
  if (erase) await clearMetrics(person.id, provider);
}
export async function dailyDeviceSync() {
  const candidates = (await list<Connection>(connectionBucket, 1000))
    .filter(item => !item.lastSync || Date.now() - Date.parse(item.lastSync) > 20 * 3600_000)
    .sort((a, b) => (a.lastSync ?? '').localeCompare(b.lastSync ?? ''));
  let count = 0;
  await Promise.all(candidates.slice(0, 8).map(async entry => {
    const [person, program] = await Promise.all([personById(entry.user), getProgram(entry.user)]);
    if (person?.status === 'active' && program.published?.plan.features.tracking) {
      try { await syncConnection(entry.user, entry.provider, 3); count++; } catch { /* A customer can renew access in the portal. */ }
    }
  }));
  return count;
}
