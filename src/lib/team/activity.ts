import 'server-only';
import { randomUUID } from 'node:crypto';
import { setRecord } from '../db';
import type { AdminSession } from '../auth-session';
import type { ActivityAction, AdminActivity } from './model';

export async function noteActivity(actor: Pick<AdminSession, 'name'>, action: ActivityAction, target?: string, id: string = randomUUID()) {
  const entry: AdminActivity = { id, at: new Date().toISOString(), actor: actor.name || 'Inhaber', action, target };
  try {
    await setRecord('admin-activity', id, entry);
  } catch {
    console.error('[ws-activity] Aktivität konnte nicht gespeichert werden.');
  }
}
