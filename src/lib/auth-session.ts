export type StaffRole = 'editor' | 'shop';
export type AdminRole = 'owner' | StaffRole;

export interface AdminSession {
  id: string;
  createdAt: string;
  expiresAt: string;
  credentialVersion?: string;
  accountId?: string;
  role?: AdminRole;
  name?: string;
}

export interface AdminCredentials {
  changedAt: string;
  version?: string;
  enabled?: boolean;
  role?: StaffRole;
  name?: string;
}

export function credentialVersion(config: AdminCredentials) {
  return config.version ?? config.changedAt;
}

export function currentAdminSession(session: AdminSession, credentials: AdminCredentials, now = Date.now()) {
  if (!(Date.parse(session.expiresAt) > now)) return false;
  if (session.accountId) return credentials.enabled === true && ['editor', 'shop'].includes(credentials.role ?? '')
    && Boolean(session.credentialVersion && credentials.version && session.credentialVersion === credentials.version);
  if (session.credentialVersion) return session.credentialVersion === credentialVersion(credentials);
  // Sessions issued before credential versioning are valid only until the next password change.
  return !credentials.version && Date.parse(session.createdAt) >= Date.parse(credentials.changedAt);
}
