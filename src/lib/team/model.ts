import { z } from 'zod';
import type { StaffRole } from '../auth-session';

export const staffLogin = z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9._-]{2,63}$/, 'Verwenden Sie 3 bis 64 Buchstaben, Zahlen, Punkte, Striche oder Unterstriche.');
export const staffRoles = z.enum(['editor', 'shop']);
export const staffRoleLabels: Record<StaffRole, string> = { editor: 'Redaktion', shop: 'Shop-Team' };
export const staffCreateInput = z.object({ login: staffLogin, name: z.string().trim().min(2).max(80), role: staffRoles }).strict();
export const staffChangeInput = z.object({ login: staffLogin, version: z.uuid(), action: z.enum(['enable', 'disable', 'reset']) }).strict();

export type StaffAccount = z.infer<typeof staffCreateInput> & { version: string; changedAt: string; enabled: boolean; hash: string };
export type StaffView = Omit<StaffAccount, 'hash'>;

export const activityLabels = {
  'account.created': 'Zugang angelegt',
  'account.enable': 'Zugang aktiviert',
  'account.disable': 'Zugang gesperrt',
  'account.reset': 'Passwort zurückgesetzt',
  'draft.saved': 'Entwurf gespeichert',
  'site.published': 'Website veröffentlicht',
  'media.uploaded': 'Bild hochgeladen',
  'media.edited': 'Bildangaben geändert',
  'shop.fulfill': 'Bestellung ausgeliefert',
  'shop.retry-mail': 'Bestellmail erneut angestoßen',
  'assistant.executed': 'Assistentenaktion ausgeführt',
  'proposal.issued': 'Freigabelink erstellt',
  'proposal.revoked': 'Freigabelink zurückgezogen'
} as const;
export type ActivityAction = keyof typeof activityLabels;
export type AdminActivity = { id: string; at: string; actor: string; action: ActivityAction; target?: string };
