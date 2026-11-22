import type { Inquiry } from '../types';

export const WITHDRAWAL_PATH = '/shop/widerruf';
export const WITHDRAWAL_LABEL = 'Vertrag widerrufen';
export const WITHDRAWAL_DECLARATION = 'Ich widerrufe den unten bezeichneten Vertrag oder Vertragsteil.';

export function withdrawalReceipt(inquiry: Pick<Inquiry, 'id' | 'name' | 'email' | 'message' | 'createdAt'>) {
  const when = new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'full', timeStyle: 'long', timeZone: 'Europe/Berlin'
  }).format(new Date(inquiry.createdAt));
  return [
    'Eingangsbestätigung für Ihren Widerruf', '', 'Eingang: ' + when, 'Vorgang: ' + inquiry.id,
    'Name: ' + inquiry.name, 'E-Mail: ' + inquiry.email, '', WITHDRAWAL_DECLARATION, inquiry.message
  ].join('\n');
}
