import test from 'node:test';
import assert from 'node:assert/strict';
import { currentAdminSession, type AdminSession } from '../src/lib/auth-session';

const changedAt = '2026-11-05T08:00:00.000Z';
const now = Date.parse('2026-11-05T09:00:00.000Z');
const session: AdminSession = {
  id: 'session', createdAt: '2026-11-05T08:59:00.000Z', expiresAt: '2026-11-05T20:59:00.000Z'
};

test('a login verified before a password change stays invalid even if its session arrives later', () => {
  const credentials = { changedAt, version: 'new-credentials' };
  assert.equal(currentAdminSession({ ...session, credentialVersion: 'old-credentials' }, credentials, now), false);
  assert.equal(currentAdminSession({ ...session, credentialVersion: 'new-credentials' }, credentials, now), true);
  assert.equal(currentAdminSession(session, credentials, now), false);
});

test('previous installations retain unexpired sessions until the next password change', () => {
  assert.equal(currentAdminSession(session, { changedAt }, now), true);
  assert.equal(currentAdminSession({ ...session, credentialVersion: changedAt }, { changedAt }, now), true);
  assert.equal(currentAdminSession({ ...session, createdAt: '2026-11-04T08:00:00Z' }, { changedAt }, now), false);
  assert.equal(currentAdminSession({ ...session, expiresAt: changedAt }, { changedAt }, now), false);
});
