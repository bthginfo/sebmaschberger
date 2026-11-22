import 'server-only';
import { randomBytes } from 'node:crypto';
import { AppError, getSettings } from '@/lib/db';
import { digest } from '@/lib/security';
import { personById } from './access';
import { metrics } from './model';
import type {ActorView, Metrics} from './model';
import { addMetrics, getProgram, ownTrackerAccount } from './program';
import {change, read, remove, save} from './store';

type Bridge = { user: string; key: string; lastSync: string | null };
const bucket = 'apple-bridges';
export async function newBridge(actor: ActorView) {
  const person = await ownTrackerAccount(actor);
  const token = randomBytes(32).toString('base64url'), key = digest(token);
  const { siteUrl } = await getSettings();
  const link = new URL('/api/coaching-portal/apple-sync', siteUrl).href;
  await save<Bridge>(bucket, key, { user: person.id, key, lastSync: null });
  await change<{key:string}|null>('apple-bridge-owners', person.id, null, () => ({key}));
  return { token, link };
}
export async function bridgeInfo(actor: ActorView) {
  const person = await ownTrackerAccount(actor);
  const current = await read<{key:string}>('apple-bridge-owners', person.id);
  const entry = current && await read<Bridge>(bucket, current.key);
  return { enabled: Boolean(entry), lastSync: entry?.lastSync ?? null };
}
export async function revokeBridge(actor: ActorView) {
  const person = await ownTrackerAccount(actor);
  const old = await read<{key:string}>('apple-bridge-owners', person.id);
  await remove('apple-bridge-owners', person.id);
  if (old) await remove(bucket, old.key);
}
export async function bridgeActor(authorization: string) {
  const token = /^Bearer ([a-zA-Z0-9_-]{43})$/u.exec(authorization)?.[1];
  const entry = token ? await read<Bridge>(bucket, digest(token)) : null;
  const current = entry && await read<{key:string}>('apple-bridge-owners', entry.user);
  if (!entry || current?.key !== entry.key) throw new AppError('Dieser Gerätezugang ist abgelaufen.', 401);
  const account = await personById(entry.user);
  if (account?.status !== 'active' || !(await getProgram(account.id)).published?.plan.features.tracking) throw new AppError('Der Gerätesync ist derzeit pausiert.', 403);
  return entry;
}
function record(value: unknown): Record<string,unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string,unknown> : {};
}
export function bridgeRows(body: unknown) {
  const data = record(record(body).data).metrics, totals = new Map<string, Metrics>();
  if (!Array.isArray(data)) throw new AppError('Sende tägliche Health-Metriken im JSON-Format.');
  for (const metric of data) {
    const {name, data: values} = record(metric);
    if (!Array.isArray(values) || (name !== 'step_count' && name !== 'sleep_analysis')) continue;
    for (const input of values) {
      const value = record(input);
      if (typeof value.date !== 'string') continue;
      const date = value.date.slice(0,10), previous = totals.get(date) ?? {date};
      if (name === 'step_count' && typeof value.qty === 'number' && value.qty >= 0) previous.steps = Math.max(previous.steps ?? 0, Math.round(value.qty));
      if (name === 'sleep_analysis') {
        const hours = ['asleep', 'core', 'deep', 'rem'].reduce((sum, key) => sum + (typeof value[key] === 'number' ? Number(value[key]) : 0), 0);
        if (hours > 0) previous.sleep = Math.max(previous.sleep ?? 0, Math.round(hours * 60));
      }
      const parsed = metrics.safeParse(previous);
      if (parsed.success) totals.set(date, parsed.data);
    }
  }
  return [...totals.values()].slice(0, 100);
}
export async function writeBridge(entry: Bridge, data: unknown) {
  const rows = bridgeRows(data);
  if (!rows.length) throw new AppError('Der Export enthält keine täglichen Schritt- oder Schlafwerte.', 400);
  await addMetrics(entry.user, 'apple', rows);
  await change<Bridge|null>(bucket, entry.key, null, value => value ? {...value, lastSync: new Date().toISOString()} : value);
  return { count: rows.length };
}
