import {ArrowLeft, ArrowRight, CheckCircle2, CircleAlert, CreditCard, Download, Hourglass, Mail, ShoppingBag, Wallet} from 'lucide-react';
import {notFound} from 'next/navigation';
import {checkoutExample, previewMoney, previewOrderEmail, previewPage, type DemoQuery} from '@/lib/commerce/preview-data';
import type {SiteLanguage} from '@/lib/types';
import {ColorModeSwitch} from './color-mode-switch';
import styles from './checkout-preview.module.css';

const states = {
  processing: {
    icon: Hourglass, de: ['Zahlung wird geprüft.', 'Diese Ansicht erscheint, solange der Zahlungsanbieter den Status noch prüft. Die Bestellung kann über ihren persönlichen Link erneut aufgerufen werden.'],
    en: ['Payment is processing.', 'This view appears while the provider checks the payment. The order can be opened again using its personal link.'],
  },
  cancelled: {
    icon: ArrowLeft, de: ['Zahlung abgebrochen.', 'Du kannst zurück zur Kasse und deine Auswahl erneut prüfen.'],
    en: ['Payment cancelled.', 'You can go back to checkout and review your selection.'],
  },
  failed: {
    icon: CircleAlert, de: ['Zahlung fehlgeschlagen.', 'Prüfe deine Auswahl an der Kasse und versuche es erneut.'],
    en: ['Payment failed.', 'Check your selection at checkout and try again.'],
  },
  refunded: {
    icon: CheckCircle2, de: ['Rückerstattung bestätigt.', 'Hier findest du die ursprüngliche Bestellsumme. Die Rückerstattung ist im Bestellstatus festgehalten.'],
    en: ['Refund confirmed.', 'Here is the original order total. The refund is recorded in the order status.'],
  },
} as const;

export async function CheckoutPreview({language, route, query}: {language:SiteLanguage;route:string[];query:DemoQuery}) {
  const english = language === 'en';
  const other = english ? 'de' : 'en';
  const first = route[0];
  const thanks = english ? 'thank-you' : 'danke';
  const emails = english ? 'emails' : 'mails';
  if (route.length > 1 || (first && ![thanks, 'status', emails].includes(first))) notFound();
  const view = first === thanks ? 'thanks' : first === emails ? 'mails' : first === 'status' ? 'status' : 'checkout';
  const example = await checkoutExample(language,query);
  const t = (de:string,en:string) => english ? en : de;
  const state = typeof query.state === 'string' && Object.hasOwn(states,query.state) ? query.state as keyof typeof states : 'processing';
  const kind = query.kind === 'refund' || query.kind === 'partialRefund' ? query.kind : 'order';
  const selectedState = states[state];
  const StatusIcon = selectedState.icon;
  const settled = view === 'thanks';
  const href = (page:Parameters<typeof previewPage>[1], params:Record<string,string> = {}, lang:SiteLanguage=language) => {
    const value = new URLSearchParams(example.params);
    for (const [key,entry] of Object.entries(params)) value.set(key,entry);
    return previewPage(lang,page) + '?' + value.toString();
  };
  const shop = english ? '/en/shop' : '/shop';
  const cart = english ? '/en/cart' : '/warenkorb';
  const mailTypes = [
    ['order',t('Bestellbestätigung','Order confirmation')],
    ['refund',t('Rückerstattung','Refund')],
    ['partialRefund',t('Teilrückerstattung','Partial refund')],
  ] as const;
  const mail = view === 'mails' ? await (await previewOrderEmail(language,query)).text() : null;
  const heading = view === 'checkout' ? t('Deine Kasse.', 'Your checkout.')
    : settled ? t('Danke für deine Bestellung.', 'Thanks for your order.')
    : view === 'mails' ? t('So sehen meine Bestellmails aus.', 'A look at my order emails.')
    : selectedState[language][0];

  return <div className={styles.preview}>
    <header className={styles.header}>
      <a href={shop} className={styles.brand}><span><img src="/media/project/sebastian-logo.svg" alt="" width={54} height={22} /></span>{example.site.name}</a>
      <div className={styles.headerActions}>
        <a href={href(view,{...(view==='status'?{state}:{}),...(view==='mails'?{kind}:{})},other)} hrefLang={other} lang={other} aria-label={english?'Deutsch':'English'}>{other.toUpperCase()}</a>
        <ColorModeSwitch language={language}/>
      </div>
    </header>
    <main id="hauptinhalt" className={styles.main}>
      <nav aria-label={t('Bestellschritte','Order steps')} className={styles.steps}>
        <a href={cart}><ShoppingBag size={16} aria-hidden="true"/>{t('Warenkorb','Cart')}</a>
        <a href={href('checkout')} aria-current={view==='checkout'?'step':undefined}><CreditCard size={16} aria-hidden="true"/>{t('Kasse','Checkout')}</a>
        <a href={href('thanks')} aria-current={settled?'step':undefined}><CheckCircle2 size={16} aria-hidden="true"/>{t('Bestätigung','Confirmation')}</a>
      </nav>
      <div className={styles.layout} data-wide={view==='mails'?'wide':undefined}>
        <section className={styles.panel}>
          <div className={styles.label}>{t('Beispielbestellung','Sample order')}</div>
          {settled && <CheckCircle2 className={styles.statusIcon} size={46} aria-hidden="true"/>}
          {view==='status' && <StatusIcon className={styles.statusIcon} size={46} aria-hidden="true"/>}
          <h1>{heading}</h1>
          {view==='checkout' && <p>{t('Hier kannst du den Bestellablauf mit Beispieldaten ausprobieren. Die Kasse läuft im Vorschau-Modus.', 'Try the order flow with sample details. This checkout is in preview mode.')}</p>}
          {settled && <p>{t('Das ist die Bestätigung einer Beispielbestellung. Hier kannst du dir die Rechnung und die Bestellmail in meiner Gestaltung ansehen.', 'This is a sample order confirmation. You can open the matching invoice and email below.')}</p>}
          {view==='status' && <p>{selectedState[language][1]}</p>}
          {view==='checkout' && <form action={previewPage(language,'thanks')} className={styles.form}>
            {example.product && <input type="hidden" name="product" value={example.product.slug}/>}
            <input type="hidden" name="quantity" value={example.quantity}/>
            <fieldset><legend>{t('Zahlungsart auswählen','Choose a payment method')}</legend>
              <label><input type="radio" name="method" value="card" defaultChecked={example.method==='card'}/><CreditCard size={21} aria-hidden="true"/>{t('Karte','Card')}</label>
              <label><input type="radio" name="method" value="wallet" defaultChecked={example.method==='wallet'}/><Wallet size={21} aria-hidden="true"/>{t('Digitales Wallet','Digital wallet')}</label>
            </fieldset>
            <button className={styles.primary} type="submit">{t('Beispielbestellung abschließen','Complete sample order')}<ArrowRight size={18} aria-hidden="true"/></button>
          </form>}
          {settled && <div className={styles.actions}>
            <a className={styles.primary} href={href('invoice')} target="_blank" rel="noreferrer"><Download size={17} aria-hidden="true"/>{t('Musterrechnung als PDF','Sample invoice as PDF')}</a>
            <a className={styles.secondary} href={href('mails')}><Mail size={17} aria-hidden="true"/>{t('Bestellmail ansehen','View order email')}</a>
          </div>}
          {view==='status' && <a className={styles.primary} href={href(state==='refunded'?'mails':'checkout',state==='refunded'?{kind:'refund'}:{})}>
            {state==='refunded'?t('Erstattungsmail ansehen','View refund email'):t('Zur Kasse','Back to checkout')}<ArrowRight size={18} aria-hidden="true"/>
          </a>}
          {mail && <>
            <nav className={styles.mailTabs} aria-label={t('E-Mail-Vorlagen','Email templates')}>
              {mailTypes.map(([key,label])=><a key={key} href={href('mails',{kind:key})} aria-current={kind===key?'page':undefined}>{label}</a>)}
            </nav>
            <iframe className={styles.mail} srcDoc={mail} sandbox="" title={t('Vorschau der ausgewählten E-Mail','Preview of the selected email')}/>
            <a className={styles.secondary} href={href('mail',{kind})} target="_blank" rel="noreferrer">{t('E-Mail einzeln öffnen','Open email in a new tab')}</a>
          </>}
        </section>
        {view!=='mails' && <aside className={styles.summary}>
          <h2>{t('Deine Bestellübersicht','Order summary')}</h2>
          <p>{example.orderId}</p>
          <div className={styles.line}>{example.product?.image && <img src={example.product.image.src} alt={example.product.image.alt} width={62} height={62}/>}<div><strong>{example.title}</strong><span>{example.quantity} × {previewMoney(example.unitPrice,language)}</span></div></div>
          <dl><div><dt>{t('Gesamt','Total')}</dt><dd>{previewMoney(example.total,language)}</dd></div></dl>
          {settled && <p>{t('Zahlungsart in der Vorschau','Sample payment method')} · {example.method==='wallet'?t('Wallet','Wallet'):t('Karte','Card')}</p>}
          <nav className={styles.statusLinks} aria-label={t('Zahlungsstatus in der Vorschau','Sample payment statuses')}>
            <span>{t('Weitere Zahlungsansichten','Other payment views')}</span>
            {([['processing',t('In Bearbeitung','Processing')],['cancelled',t('Abgebrochen','Cancelled')],['failed',t('Fehlgeschlagen','Failed')],['refunded',t('Erstattet','Refunded')]] as const).map(([key,label])=>
              <a key={key} href={href('status',{state:key})} aria-current={view==='status'&&state===key?'page':undefined}>{label}</a>)}
          </nav>
        </aside>}
      </div>
      <a className={styles.back} href={shop}><ArrowLeft size={17} aria-hidden="true"/>{t('Zurück zum Shop','Back to the shop')}</a>
    </main>
  </div>;
}
