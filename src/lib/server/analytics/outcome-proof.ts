import { createHmac, timingSafeEqual } from 'node:crypto';
import { analyticsOutcome, type AnalyticsOutcome } from '../../analytics/outcome';

const validFor = 30 * 60000;
const hmac = (secret: string, domain: string, value: string) => createHmac('sha256',secret).update(domain+'\0'+value).digest('base64url');

export function outcomeProof(kind: AnalyticsOutcome['kind'], reference: string, at: string, secret = process.env.AUTH_SECRET, now = Date.now()) {
  if (!secret || secret.length < 32 || !(Date.parse(at) > now-validFor && Date.parse(at) <= now+5000)) return undefined;
  const id = hmac(secret,'statistics-outcome-id',kind+'\0'+reference);
  const payload = Buffer.from(JSON.stringify({id,kind,at})).toString('base64url');
  return payload+'.'+hmac(secret,'statistics-outcome-proof',payload);
}

export function readOutcomeProof(proof: string, secret = process.env.AUTH_SECRET, now = Date.now()): AnalyticsOutcome | null {
  if (!secret || secret.length < 32 || !/^[\w-]{30,300}\.[\w-]{43}$/.test(proof)) return null;
  const [payload,signature] = proof.split('.');
  if (!timingSafeEqual(Buffer.from(signature),Buffer.from(hmac(secret,'statistics-outcome-proof',payload)))) return null;
  try {
    const parsed = analyticsOutcome.parse(JSON.parse(Buffer.from(payload,'base64url').toString('utf8')));
    return Date.parse(parsed.at) > now-validFor && Date.parse(parsed.at) <= now+5000 ? parsed : null;
  } catch { return null; }
}
