import 'server-only';
import { generateVAPIDKeys, sendNotification } from 'web-push';
import { AppError, deleteRecord, getRecord, getSettings, listRecords, mutateRecord } from '@/lib/db';
import { decrypt, digest, encrypt } from '@/lib/security';
import { currentPushDevice, pushDeviceCollection, savePushDevice, type PushDevice } from './devices';
import { DEFAULT_PUSH_PREFERENCES, type WorkspaceAppScope, type WorkspacePushCategory } from './model';
import { limitPushPreferences, pushDeviceInput, pushSubscriptionInput } from './subscription';

type Keys = { publicKey: string; privateCiphertext: string };
export type PushIdentity = { scope: WorkspaceAppScope; accountId: string; categories: WorkspacePushCategory[] };
type NotificationKind = WorkspacePushCategory | 'test';

async function pushKeys(create = false) {
  const current = await getRecord<Keys>('workspace-push', 'vapid');
  if (current || !create) return current;
  const generated = generateVAPIDKeys();
  const seed = { publicKey: generated.publicKey, privateCiphertext: encrypt(generated.privateKey) };
  return mutateRecord('workspace-push', 'vapid', seed, value => value);
}

export async function pushStatus(identity: PushIdentity, device?: PushDevice | null) {
  const { scope, accountId, categories } = identity;
  const available = Boolean(categories.length);
  const [keys, previous] = await Promise.all([available ? pushKeys(true) : null, device === undefined ? currentPushDevice(scope) : device]);
  const current = previous?.accountId === accountId ? previous : null;
  return { available, categories, publicKey: keys?.publicKey ?? '', enabled: available && Boolean(current),
    preferences: limitPushPreferences(current?.preferences ?? DEFAULT_PUSH_PREFERENCES, categories) };
}

export async function updatePushStatus(identity: PushIdentity, input: unknown) {
  if (!identity.categories.length) throw new AppError('This account does not have access to push notifications.', 403);
  const data = pushDeviceInput.parse(input);
  await pushKeys(true);
  const previous = await currentPushDevice(identity.scope);
  if (!data.subscription && previous?.accountId !== identity.accountId) throw new AppError('Enable notifications on this device first.', 409);
  const device = await savePushDevice(identity.scope, {
    accountId: identity.accountId,
    subscriptionCiphertext: data.subscription ? encrypt(JSON.stringify(data.subscription)) : previous!.subscriptionCiphertext,
    endpointDigest: data.subscription ? digest(data.subscription.endpoint) : previous!.endpointDigest,
    preferences: limitPushPreferences(data.preferences, identity.categories), language: data.language,
  });
  return pushStatus(identity, device);
}

const pushCopy: Record<NotificationKind, { de: string; en: string }> = {
  messages: { de: 'Neue Nachricht', en: 'New message' }, schedule: { de: 'Neues im Spiel- oder Trainingsplan', en: 'Schedule update' },
  news: { de: 'Neue Vereinsmeldung', en: 'Club news' }, tactics: { de: 'Taktik aktualisiert', en: 'Tactics update' },
  inquiries: { de: 'Neue Website-Anfrage', en: 'New website inquiry' }, test: { de: 'Testbenachrichtigung', en: 'Test notification' },
};

function notificationPath(scope: WorkspaceAppScope, kind: NotificationKind) {
  if (scope === 'cms') return kind === 'messages' ? '/admin/club?view=messages' : kind === 'inquiries' ? '/admin?view=inquiries' : '/admin';
  const anchors = { messages: 'messages', schedule: 'calendar', news: 'news', tactics: 'tactics', test: 'settings', inquiries: 'settings' };
  return '/members#' + anchors[kind];
}

function contactFor(siteUrl: string) {
  try {
    const url = new URL(siteUrl);
    if (url.protocol === 'https:' && url.hostname.includes('.') && url.hostname !== 'localhost') return url.origin;
  } catch { /* Local installations have no public host. */ }
  return 'mailto:notifications@example.invalid';
}

async function deliver(devices: PushDevice[], kind: NotificationKind) {
  if (!devices.length) return 0;
  const [keys, settings] = await Promise.all([pushKeys(), getSettings()]);
  if (!keys) return 0;
  const vapidDetails = { subject: contactFor(settings.siteUrl), publicKey: keys.publicKey, privateKey: decrypt(keys.privateCiphertext) };
  const targets = [...new Map(devices.map(device => [device.endpointDigest, device])).values()];
  let sent = 0;
  for (let start = 0; start < targets.length; start += 36) {
    await Promise.all(targets.slice(start, start + 36).map(async device => {
      try {
        const subscription = pushSubscriptionInput.parse(JSON.parse(decrypt(device.subscriptionCiphertext)));
        const language = device.language;
        const path = notificationPath(device.scope, kind);
        await sendNotification(subscription, JSON.stringify({
          title: pushCopy[kind][language],
          body: language === 'de' ? 'Öffne die App, um das Update zu sehen.' : 'Open the app to see the update.',
          path, tag: 'workspace-' + kind,
        }), { vapidDetails, TTL: 15 * 60, timeout: 3000, urgency: 'normal' });
        sent++;
      } catch (error) {
        const status = (error as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          const current = await getRecord<PushDevice>(pushDeviceCollection, device.id).catch(() => null);
          if (current?.updatedAt === device.updatedAt) await deleteRecord(pushDeviceCollection, device.id).catch(() => {});
        }
      }
    }));
  }
  return sent;
}

export async function notifyWorkspaceAccounts(scope: WorkspaceAppScope, accounts: readonly string[], kind: WorkspacePushCategory) {
  if (!accounts.length) return;
  const audience = new Set(accounts);
  try {
    const devices = (await listRecords<PushDevice>(pushDeviceCollection))
      .filter(device => device.scope === scope && audience.has(device.accountId) && device.preferences[kind]);
    await deliver(devices, kind);
  } catch {
    console.warn('[workspace-push] Delivery could not be completed.');
  }
}

export async function testWorkspacePush(identity: PushIdentity) {
  const device = await currentPushDevice(identity.scope);
  if (!identity.categories.length || device?.accountId !== identity.accountId) throw new AppError('Enable notifications on this device first.', 409);
  if (!await deliver([device], 'test')) throw new AppError('The push service did not accept the test. Check your device permissions and try again.', 502);
}
