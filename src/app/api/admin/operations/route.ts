import { requireAdmin } from '@/lib/auth';
import { getDraftConfig, getPublished, getRecord, getSettings } from '@/lib/db';
import { handler, json } from '@/lib/http';
import { smtpSetupId } from '@/lib/operations/smtp';
import type { OperationCheck } from '@/lib/operations/model';
import type { CommerceStore } from '@/lib/commerce/model';
import { expectedStripeMode, stripeKeyMode } from '@/lib/commerce/stripe-mode';
import { nativeAccountViews } from '@/lib/server/social/connectors/runtime';
import { plannerReadiness, publishingRepository } from '@/lib/server/social/publishing/store';
import { publicConnection } from '@/lib/server/social/publishing/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const latest = (values: Array<string | null | undefined>) => values.filter((value): value is string => Boolean(value)).sort().at(-1);

export const GET = handler(async () => {
  await requireAdmin();
  const [settings, published, draft, smtpTest, commerce] = await Promise.all([
    getSettings(), getPublished(), getDraftConfig(), getRecord<{ setup: string; at: string }>('operation-checkpoints', 'smtp'),
    getRecord<CommerceStore>('commerce', 'state')
  ]);
  const checks: OperationCheck[] = [];
  const confirmed = settings.smtp.enabled && smtpTest?.setup === smtpSetupId(settings.smtp);
  checks.push({ id: 'smtp', label: 'E-Mail-Versand', action: 'email', state: confirmed ? 'confirmed' : 'waiting',
    detail: confirmed ? 'Der Mailserver hat die letzte Testnachricht angenommen.' : settings.smtp.enabled
      ? 'Die Verbindung ist gespeichert. Eine Testmail bestätigt den Versand.' : 'E-Mail-Versand einrichten. Neue Anfragen liegen bereits im Postfach.',
    at: confirmed ? smtpTest?.at : undefined });

  const orders = commerce?.orders ?? [];
  if (published.config.modules?.commerce || draft.modules?.commerce || orders.length) {
    const mode = expectedStripeMode(process.env, settings.siteUrl);
    const paymentAt = latest(orders.filter(order => order.paymentMode === mode).map(order => order.paidAt));
    const ready = stripeKeyMode(process.env.STRIPE_SECRET_KEY) === mode && Boolean(process.env.STRIPE_WEBHOOK_SECRET);
    const failures = orders.filter(order => ['paid', 'refunded'].includes(order.status) && ['failed', 'not-configured'].includes(order.mail.status)).length;
    checks.push({ id: 'payments', label: 'Shop-Zahlungen', action: 'commerce', state: ready && paymentAt ? 'confirmed' : 'waiting',
      detail: !published.config.modules?.commerce?.enabled ? 'Neue Verkäufe sind pausiert. Bestehende Bestellungen bleiben erreichbar.'
        : !ready ? 'Stripe-Zugang und Webhook für diese Umgebung prüfen.' : paymentAt
          ? (mode === 'live' ? 'Letzte bestätigte Live-Zahlung.' : 'Letzte bestätigte Testzahlung.') : 'Verbindung hinterlegt. Ein vollständiger Testkauf steht aus.',
      at: paymentAt });
    if (failures) checks.push({ id: 'order-mail', label: 'Bestellmails', action: 'commerce', state: 'attention',
      detail: failures === 1 ? 'Eine Bestellmail braucht Aufmerksamkeit.' : `${failures} Bestellmails brauchen Aufmerksamkeit.` });
  }
  if (draft.modules?.socialPublishing?.enabled && draft.modules?.socialStudio?.enabled) {
    const [records, connections, native, readiness] = await Promise.all([
      publishingRepository.publications(), publishingRepository.connections(), nativeAccountViews(), plannerReadiness()
    ]);
    const now = Date.now();
    const accounts = [...native, ...connections.map(row => publicConnection(row, new Date(now).toISOString()))];
    const renewals = accounts.filter(account => account.status === 'expired' ||
      account.status === 'connected' && account.expiresAt && Date.parse(account.expiresAt) <= now + 7 * 86400000).length;
    const sendAt = latest(records.filter(({entry}) => entry.status === 'published').map(({entry}) => entry.process.confirmedAt));
    const blocked = records.filter(({entry,wake}) => ['failed', 'needs_review'].includes(entry.status) || wake && Date.parse(wake.at) < now - 10 * 60000).length;
    checks.push({ id: 'social', label: 'Automatische Social-Beiträge', action: 'planner',
      state: blocked ? 'attention' : sendAt && readiness.queue ? 'confirmed' : 'waiting',
      detail: blocked ? `${blocked} Beiträge im Kalender prüfen.` : !readiness.queue ? 'Der Kalender ist nutzbar. Automatisches Senden braucht eine eingerichtete Warteschlange.'
        : sendAt ? 'Letzter vom Kanal bestätigter Beitrag.' : 'Ein automatisch gesendeter Beitrag wurde noch nicht bestätigt.',
      at: sendAt });
    checks.push({ id: 'channels', label: 'Social-Kanäle', action: 'channels',
      state: renewals ? 'attention' : accounts.some(account => account.status === 'connected') ? 'confirmed' : 'waiting',
      detail: renewals ? `${renewals} Verbindungen laufen bald ab oder müssen erneuert werden.` : accounts.some(account => account.status === 'connected')
        ? 'Mindestens ein Kanal ist als verbunden gespeichert.' : 'Verbinden Sie den ersten Kanal, um automatisch zu senden.' });
  }
  return json({ checks });
});
