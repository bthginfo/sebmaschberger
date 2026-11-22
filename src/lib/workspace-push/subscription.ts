import { z } from 'zod';
import { WORKSPACE_PUSH_CATEGORIES, type WorkspacePushCategory, type WorkspacePushPreferences } from './model';

const hosts = new Set(['fcm.googleapis.com', 'android.googleapis.com', 'web.push.apple.com', 'push.services.mozilla.com']);
const suffixes = ['.push.apple.com', '.push.services.mozilla.com', '.notify.windows.com', '.push.microsoft.com'];
export function pushEndpointAllowed(input: string): boolean {
  try {
    const url = new URL(input);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port && !url.hash
      && (hosts.has(url.hostname) || suffixes.some(suffix => url.hostname.endsWith(suffix))) && url.pathname.length > 1;
  } catch { return false; }
}

const subscriptionKey = (length: number) => z.string().regex(/^[A-Za-z0-9_-]+$/u).refine(value => Buffer.from(value, 'base64url').length === length);
export const pushSubscriptionInput = z.strictObject({
  endpoint: z.string().max(2048).refine(pushEndpointAllowed, 'Unsupported browser push service.'),
  keys: z.strictObject({ p256dh: subscriptionKey(65), auth: subscriptionKey(16) }),
  expirationTime: z.number().positive().nullable().optional(),
});
const pushPreferences = z.strictObject({ messages: z.boolean(), schedule: z.boolean(), news: z.boolean(), tactics: z.boolean(), inquiries: z.boolean() });
export const pushDeviceInput = z.strictObject({
  subscription: pushSubscriptionInput.optional(),
  preferences: pushPreferences,
  language: z.enum(['de', 'en']),
});

export function limitPushPreferences(preferences: WorkspacePushPreferences, allowed: readonly WorkspacePushCategory[]): WorkspacePushPreferences {
  return Object.fromEntries(WORKSPACE_PUSH_CATEGORIES.map(key => [key, allowed.includes(key) && preferences[key]])) as WorkspacePushPreferences;
}
