import 'server-only';
import { digest } from '../security';
import type { SmtpSettings } from '../types';

export function smtpSetupId(smtp: SmtpSettings) {
  return digest(JSON.stringify([smtp.host, smtp.port, smtp.secure, smtp.from, smtp.user, smtp.to, smtp.password ?? '']));
}
