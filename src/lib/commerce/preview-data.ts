import 'server-only';
import {notFound} from 'next/navigation';
import {canonicalUrl, publishedContent} from '../content';
import {getBusinessSettings, renderConfiguredPdf} from '../business/service';
import {productCopy} from './route-pages';
import {commerceEmail, type CommerceMailKind} from './email';
import type {SiteLanguage} from '../types';

export type DemoQuery = Record<string, string | string[] | undefined>;
export const checkoutPreviewPath = (language: SiteLanguage) => language === 'en' ? '/en/checkout/preview' : '/checkout/vorschau';
export const previewPage = (language: SiteLanguage, view: 'checkout'|'thanks'|'status'|'mails'|'invoice'|'mail') => {
  const parts = language === 'en'
    ? {checkout:'',thanks:'/thank-you',status:'/status',mails:'/emails',invoice:'/invoice',mail:'/mail'}
    : {checkout:'',thanks:'/danke',status:'/status',mails:'/mails',invoice:'/rechnung',mail:'/mail'};
  return checkoutPreviewPath(language) + parts[view];
};
export const previewMoney = (amount: number, language: SiteLanguage) =>
  (amount/100).toLocaleString(language === 'en' ? 'en-GB' : 'de-DE', {style:'currency',currency:'EUR'});

export async function checkoutExample(language: SiteLanguage, query: DemoQuery) {
  const content = await publishedContent();
  const shop = content.config.modules?.commerce;
  if (!shop?.enabled) notFound();
  const samples = shop.products.filter(product => product.active && product.sample);
  const product = samples.find(item => item.slug === query.product) ?? samples[0];
  const title = product ? productCopy(product, language).title : (language === 'en' ? 'Example order item' : 'Beispielartikel');
  const requested = typeof query.quantity === 'string' ? Number(query.quantity) : 1;
  const quantity = Number.isInteger(requested) && requested > 0 && requested <= 20 ? requested : 1;
  const method = query.method === 'wallet' ? 'wallet' : 'card';
  const unitPrice = product?.priceCents ?? 1600;
  const total = unitPrice * quantity;
  const params = new URLSearchParams({quantity: String(quantity), method, ...(product ? {product: product.slug} : {})});
  return {site:content.config, product, title, quantity, unitPrice, total, params, method, orderId:'DEMO-1042'};
}

export async function previewInvoice(language: SiteLanguage, query: DemoQuery) {
  const [example,settings] = await Promise.all([checkoutExample(language, query),getBusinessSettings()]);
  const english = language === 'en';
  const bytes = await renderConfiguredPdf({
    kind:'invoice', number:'DEMO-1042', title: english ? 'Example purchase' : 'Beispielbestellung',
    issuedAt:'2026-11-22T12:00:00.000Z', preview:true, language, priceMode:'gross',
    supplier:{name:example.site.name,address:english?'1 Example Street\n12345 Sample City':'Beispielweg 1\n12345 Musterstadt',email:''},
    buyer:{name:english?'Sample customer':'Musterkunde',address:english?'2 Sample Lane\n12345 Sample City':'Musterstraße 2\n12345 Musterstadt'},
    items:[{description:example.title,quantity:example.quantity,unitPriceCents:example.unitPrice,taxRate:19}],
    notes:[english?'Example totals include a sample VAT rate. This file is a design preview.':'Die Beträge zeigen beispielhaft 19 % Umsatzsteuer. Diese Datei ist eine Gestaltungsvorschau.'],
  },{design:{...settings.design,paymentNote:english?'Thank you for your order.':settings.design.paymentNote}});
  return new Response(new Uint8Array(bytes), {headers:{
    'Content-Type':'application/pdf', 'Content-Disposition':`inline; filename="${english?'sample-invoice':'musterrechnung'}.pdf"`,
    'Cache-Control':'no-store', 'X-Robots-Tag':'noindex, nofollow', 'X-Content-Type-Options':'nosniff',
  }});
}

export async function previewOrderEmail(language: SiteLanguage, query: DemoQuery) {
  const [example,settings,base] = await Promise.all([checkoutExample(language,query),getBusinessSettings(),canonicalUrl()]);
  const kind: CommerceMailKind = query.kind === 'refund' || query.kind === 'partialRefund' ? query.kind : 'order';
  const refund = kind === 'partialRefund' ? Math.round(example.total/2) : example.total;
  const rendered = commerceEmail({
    kind, design:settings.design, templates:language==='de'?settings.templates:{}, language,
    details:{orderId:example.orderId,lines:[`${example.quantity} × ${example.title}`],total:previewMoney(example.total,language),
      refundedCents:refund, receiptUrl:base+previewPage(language,'thanks')+'?'+example.params},
    footer:language==='en'?'Email preview · sample order':'E-Mail-Vorschau · Beispielbestellung',
  });
  return new Response(rendered.html,{headers:{
    'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow',
    'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'self'",
    'X-Frame-Options':'SAMEORIGIN',
  }});
}
