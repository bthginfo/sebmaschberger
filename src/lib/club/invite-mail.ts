import 'server-only';
import { randomUUID } from 'node:crypto';
import { newsletterMailReady, sendNewsletterMail } from '@/lib/mail';

/** Called after the endpoint has checked the request origin. */
export function clubInviteLink(request: Request, token: string) {
  const configured = process.env.VERCEL_ENV === 'production' ? process.env.NEXT_PUBLIC_SITE_URL : undefined;
  const url = new URL('/members/join', configured || request.headers.get('origin') || request.url);
  url.hash = token;
  return url.href;
}

const escapeHtml = (text: string) => text.replace(/[<>&"]/gu, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[char]!);

export async function deliverClubInvite(email: string, link: string, send: boolean, brandName: string) {
  if (!send) return 'link';
  if (!await newsletterMailReady()) return 'unavailable';
  try {
    const text = [
      'You have been invited to the member area of ' + brandName + '.',
      'Du wurdest in den Mitgliederbereich von ' + brandName + ' eingeladen.',
      'Set your password · Lege dein Passwort fest:',
      link,
      'The link can be used once within five days. Der Link ist fünf Tage gültig und einmal nutzbar.',
    ].join('\n\n');
    await sendNewsletterMail({
      id: 'club-' + randomUUID(), to: email, subject: brandName.replace(/[\r\n]/gu, ' ') + ' · Invitation / Einladung',
      text, html: '<p>You have been invited to the member area of ' + escapeHtml(brandName) + '.</p><p>Du wurdest in den Mitgliederbereich eingeladen.</p><p><a href="' + escapeHtml(link) + '">Set your password · Passwort festlegen</a></p>',
    });
    return 'sent';
  } catch {
    return 'failed';
  }
}
