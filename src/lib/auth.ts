import 'server-only';
import { cookies } from 'next/headers';
import { randomBytes, randomUUID } from 'node:crypto';
import { AppError, deleteRecord, getRecord, getSessionRecord, mutateRecord, setRecord, updateExistingRecord } from './db';
import { digest, verifyPassword } from './security';
import { credentialVersion, currentAdminSession, type AdminCredentials, type AdminRole, type AdminSession } from './auth-session';
import type { StaffAccount } from './team/model';
import { disconnectWorkspacePush } from './workspace-push/devices';
export type { AdminSession } from './auth-session';

export const SESSION_COOKIE = 'ws_admin_session';
interface AuthConfig extends AdminCredentials { hash: string }

export async function authConfig(): Promise<AuthConfig> {
  const existing = await getRecord<AuthConfig>('auth', 'admin');
  if (existing) return existing;
  const hash = process.env.ADMIN_INITIAL_PASSWORD_HASH;
  if (!hash?.startsWith('scrypt:v1:')) throw new AppError('Der Administrationszugang muss zuerst eingerichtet werden.', 503);
  const config = { hash, version: randomUUID(), changedAt: new Date().toISOString() };
  return mutateRecord<AuthConfig>('auth', 'admin', config, current => current);
}

export async function checkPassword(password: string, accountId?: string): Promise<AuthConfig | null> {
  if (accountId) {
    const account = await getRecord<StaffAccount>('staff-accounts', accountId);
    const valid = await verifyPassword(password, account?.hash ?? (await authConfig()).hash);
    return valid && account?.enabled ? account : null;
  }
  const config = await authConfig();
  return await verifyPassword(password, config.hash) ? config : null;
}

export async function createSession(credentials: AdminCredentials, accountId?: string): Promise<void> {
  await disconnectWorkspacePush('cms', accountId ?? 'cms-owner').catch(() => {});
  const token = randomBytes(32).toString('base64url');
  const id = digest(token);
  const now = Date.now();
  const session: AdminSession = {
    id, createdAt: new Date(now).toISOString(), expiresAt: new Date(now + 12 * 3600000).toISOString(),
    credentialVersion: credentialVersion(credentials), ...(accountId ? { accountId } : {})
  };
  await setRecord('sessions', id, session);
  (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 12 * 3600 });
}

export async function getSession(): Promise<AdminSession | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !/^[a-zA-Z0-9_-]{43}$/.test(token)) return null;
  return activeSession(digest(token));
}

export async function activeSession(id: string): Promise<AdminSession | null> {
  const record = await getSessionRecord(id);
  if (!record || !currentAdminSession(record.session, record.credentials)) return null;
  return { ...record.session, role: record.session.accountId ? record.credentials.role : 'owner', name: record.credentials.name };
}

export async function requireAdmin(allowed: readonly AdminRole[] = ['owner']): Promise<AdminSession> {
  const session = await getSession();
  if (!session) throw new AppError('Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.', 401);
  if (!session.role || !allowed.includes(session.role)) throw new AppError('Ihr Zugang hat für diese Funktion keine Berechtigung.', 403);
  return session;
}

export async function logout(): Promise<void> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) await deleteRecord('sessions', digest(token));
  await disconnectWorkspacePush('cms').catch(() => {});
  (await cookies()).delete(SESSION_COOKIE);
}

export async function changePassword(previous: AuthConfig, hash: string, accountId?: string): Promise<void> {
  const next = { hash, version: randomUUID(), changedAt: new Date().toISOString() };
  const replace = <T extends AuthConfig>(current: T): T => {
    if (current.hash !== previous.hash || credentialVersion(current) !== credentialVersion(previous)) {
      throw new AppError('Das Passwort wurde inzwischen geändert. Bitte melden Sie sich erneut an.', 409);
    }
    return { ...current, ...next };
  };
  const updated = accountId
    ? await updateExistingRecord<StaffAccount>('staff-accounts', accountId, replace)
    : await mutateRecord<AuthConfig>('auth', 'admin', previous, replace);
  if (!updated) throw new AppError('Der Zugang ist nicht mehr verfügbar.', 409);
  await createSession(updated, accountId);
}
