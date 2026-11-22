import 'server-only';
import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { deleteRecord, getRecord, setRecord } from '@/lib/db';
import { digest } from '@/lib/security';
import type { WorkspaceAppScope, WorkspacePushPreferences } from './model';

export const pushDeviceCollection = 'workspace-push-devices';
const cookieName = (scope: WorkspaceAppScope) => 'ws_push_' + scope;
const valid = (token: string | undefined) => token && /^[A-Za-z0-9_-]{43}$/u.test(token);
const deviceId = (scope: WorkspaceAppScope, token: string) => digest('workspace-push:' + scope + ':' + token);

export type PushDevice = {
  id: string; scope: WorkspaceAppScope; accountId: string; subscriptionCiphertext: string; endpointDigest: string;
  preferences: WorkspacePushPreferences; language: 'de' | 'en'; updatedAt: string;
};

export async function currentPushDevice(scope: WorkspaceAppScope) {
  const token = (await cookies()).get(cookieName(scope))?.value;
  return valid(token) ? getRecord<PushDevice>(pushDeviceCollection, deviceId(scope, token!)) : null;
}

export async function savePushDevice(scope: WorkspaceAppScope, fields: Omit<PushDevice, 'id' | 'scope' | 'updatedAt'>) {
  const jar = await cookies();
  const previous = jar.get(cookieName(scope))?.value;
  const token = valid(previous) ? previous! : randomBytes(32).toString('base64url');
  const id = deviceId(scope, token);
  const device = { ...fields, id, scope, updatedAt: new Date().toISOString() };
  await setRecord(pushDeviceCollection, id, device);
  jar.set(cookieName(scope), token, { path: '/', httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', maxAge: 365 * 24 * 3600 });
  return device;
}

export async function disconnectWorkspacePush(scope: WorkspaceAppScope, unlessAccount?: string) {
  const jar = await cookies();
  const name = cookieName(scope);
  const token = jar.get(name)?.value;
  if (!valid(token)) return;
  const id = deviceId(scope, token!);
  if (unlessAccount && (await getRecord<PushDevice>(pushDeviceCollection, id))?.accountId === unlessAccount) return;
  await deleteRecord(pushDeviceCollection, id);
  jar.delete(name);
}
