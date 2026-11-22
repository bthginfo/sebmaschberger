import {brandedEmail, type DocumentDesign} from '../business/design';
import {defaultEmailTemplates, renderEmailTemplate} from '../email-templates';
import type {EmailTemplates, SiteLanguage} from '../types';

export type CommerceMailKind = 'order' | 'refund' | 'partialRefund';
export type CommerceMailDetails = {
  orderId: string;
  lines: string[];
  total: string;
  subtotal?: string;
  tax?: string;
  shipping?: string;
  refundedCents?: number;
  receiptUrl: string;
};
const englishDefaults = {
  orderSubject: '{brand} · Your order is confirmed',
  orderBody: 'Thanks for your order. Your payment has been confirmed.\n\nOrder {orderId}\n{items}\nTotal {total}\n\nYou’ll find the order details and any available files in your order.',
  refundSubject: '{brand} · Your refund',
  refundBody: 'Your refund has been confirmed for order {orderId}.\n\n{items}\nOriginal total {total}\nRefunded amount {refundAmount}\n\nYou can find the details in your order.',
  partialRefundSubject: '{brand} · Your partial refund',
  partialRefundBody: 'We’ve refunded {refundAmount} for order {orderId}.\nOriginal total {total}\n\nYou can check the remaining items and downloads in your order.',
};

export function commerceEmail({
  kind, details, design, templates, fallbackTemplates, logoSrc, footer, language = 'de',
}: {
  kind: CommerceMailKind;
  details: CommerceMailDetails;
  design: DocumentDesign;
  templates: EmailTemplates;
  fallbackTemplates?: EmailTemplates;
  logoSrc?: string;
  footer?: string;
  language?: SiteLanguage;
}) {
  const english = language === 'en';
  const values = {
    brand: design.brandName, orderId: details.orderId, items: details.lines.join('\n'),
    total: details.total, subtotal: details.subtotal || details.total,
    tax: details.tax || (english ? 'Included where applicable' : 'Soweit enthalten'),
    shipping: details.shipping || (english ? '€0.00' : '0,00 €'),
    refundAmount: ((details.refundedCents ?? 0) / 100).toLocaleString(english ? 'en-GB' : 'de-DE', { style: 'currency', currency: 'EUR' }),
    receiptUrl: details.receiptUrl,
  };
  const subjectKey = `${kind}Subject` as const;
  const bodyKey = `${kind}Body` as const;
  const defaults = english ? englishDefaults : defaultEmailTemplates;
  const subject = renderEmailTemplate(templates[subjectKey] || fallbackTemplates?.[subjectKey] || defaults[subjectKey], values).replace(/[\r\n]+/g, ' ');
  const body = renderEmailTemplate(templates[bodyKey] || fallbackTemplates?.[bodyKey] || defaults[bodyKey], values);
  const text = body.includes(details.receiptUrl) ? body : body + '\n\n' + details.receiptUrl;
  const html = brandedEmail({
    subject,
    heading: kind === 'order'
      ? (english ? 'Thanks for your order.' : 'Danke für deine Bestellung.')
      : (english ? 'Your refund is confirmed.' : 'Deine Rückerstattung ist bestätigt.'),
    body: body.replace(details.receiptUrl, '').trim(),
    actionLabel: english ? 'View your order' : 'Bestellung ansehen',
    actionUrl: details.receiptUrl,
    design, logoSrc, footer, language,
  });
  return {subject,text,html};
}
