"use client";

import {useEffect,useRef,useState} from 'react';
import {CheckCircle2,Download,RefreshCw,ShieldCheck} from 'lucide-react';
import type {CheckoutResult,PublicCommerceOrder} from '@/lib/commerce/contracts';
import {clearCheckoutAttempt} from '@/lib/commerce/checkout-attempt';
import {reportConfirmedOutcome} from '@/lib/analytics/client';
import styles from './commerce.module.css';

const money=(cents:number)=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(cents/100);
export function CommerceReceipt({initial,accessKey,canceled,withdrawalHref}:{initial:PublicCommerceOrder;accessKey:string;canceled:boolean;withdrawalHref?:string}){
  const [order,setOrder]=useState(initial),[busy,setBusy]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const inFlight=useRef(false);
  useEffect(()=>{void reportConfirmedOutcome(order.statisticsProof);},[order.statisticsProof]);
  useEffect(()=>{if(['paid','refunded'].includes(order.status))try{clearCheckoutAttempt(sessionStorage,order.id,true);}catch{}},[order.id,order.status]);
  async function action(value:'refresh'|'resume'|'cancel'){
    if(inFlight.current)return;inFlight.current=true;setBusy(value);setError('');setNotice('');
    try{
      const response=await fetch('/api/commerce/order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({order:order.id,key:accessKey,action:value})});
      const result=await response.json() as {order:PublicCommerceOrder;checkout:CheckoutResult;error?:string};
      if(!response.ok)throw new Error(result.error||'Der Status konnte noch nicht geprüft werden. Bitte versuche es erneut.');
      setOrder(result.order);
      if(value==='resume'&&result.checkout.url){const url=new URL(result.checkout.url);if(url.protocol!=='https:'||url.hostname!=='checkout.stripe.com'||url.port||url.username||url.password)throw new Error('Die Checkout-Adresse konnte nicht geprüft werden.');window.location.assign(url.href);return;}
      setNotice(value==='cancel'&&result.order.status==='expired'?'Die Kasse wurde beim Zahlungsanbieter beendet. Eine neue Bestellung ist jetzt möglich.':'Der Bestellstatus wurde geprüft.');
    }catch(reason){setError(reason instanceof Error?reason.message:'Der Bestellstatus ist gerade nicht erreichbar.');}
    finally{setBusy('');inFlight.current=false;}
  }
  const paid=order.status==='paid',full=order.status==='refunded',pending=order.status==='pending',processing=order.status==='processing';
  const title=full?'Deine Bestellung wurde erstattet.':paid?order.refundStatus==='partial'?'Deine Bestellung wurde teilweise erstattet.':'Deine Zahlung ist bestätigt.':processing?'Deine Zahlung wird noch bestätigt.':pending&&canceled?'Du bist aus der Kasse zurück.':pending?'Deine Zahlung ist noch offen.':order.status==='expired'?'Diese Kasse ist abgelaufen.':'Diese Zahlung wurde nicht abgeschlossen.';
  const explanation=full?'Der vollständige Bestellbetrag wurde als erstattet gemeldet. Digitale Downloadrechte sind gesperrt.':paid?order.refundStatus==='partial'?'Der angezeigte Teilbetrag wurde erstattet. Die übrigen bezahlten Leistungen und digitalen Downloadrechte bleiben bestehen.':'Vielen Dank. Hier findest du die bestätigte Bestellung und deine freigegebenen Dateien.':processing?'Der Zahlungsanbieter bearbeitet die Zahlung noch. Bitte starte keine zweite Bestellung. Prüfe den Status hier erneut.':pending&&canceled?'Die Rückkehr beendet die Zahlung noch nicht. Du kannst dieselbe Kasse fortsetzen oder sie ausdrücklich beim Zahlungsanbieter beenden.':pending?'Eine Rückkehr vom Zahlungsanbieter allein bestätigt keine Zahlung. Prüfe den Status oder öffne dieselbe Kasse erneut.':'Du kannst zum Shop zurückkehren und ausdrücklich eine neue Kasse starten. Für diese Bestellung sind keine Downloads freigegeben.';
  return <main className={styles.receiptPage} id="hauptinhalt">
    <div className={styles.receiptContent}>
      <header className={styles.receiptHeader}>{paid||full?<CheckCircle2 size={28} aria-hidden="true"/>:<ShieldCheck size={28} aria-hidden="true"/>}<h1>{title}</h1><p>{explanation}</p></header>
      <dl className={styles.orderFacts}><div><dt>Bestellnummer</dt><dd>{order.id}</dd></div><div><dt>Status</dt><dd>{order.statusLabel}</dd></div></dl>
      <section aria-labelledby="order-items"><h2 id="order-items">Deine Bestellung</h2><ul className={styles.receiptItems}>{order.items.map((item,index)=><li key={index}><div><strong>{item.quantity} × {item.title}</strong>{item.variant&&<span>{item.variant}</span>}</div><span>{money(item.quantity*item.unitPriceCents)}</span></li>)}</ul>
        <dl className={styles.receiptTotals}><div><dt>Zwischensumme</dt><dd>{money(order.subtotalCents)}</dd></div><div><dt>Versand</dt><dd>{money(order.shippingCents)}</dd></div>{order.taxCents!==undefined&&<div><dt>Enthaltene Umsatzsteuer</dt><dd>{money(order.taxCents)}</dd></div>}<div><dt>Bestellsumme</dt><dd>{money(order.totalCents)}</dd></div>{order.refundedCents>0&&<><div><dt>Insgesamt erstattet</dt><dd>{money(order.refundedCents)}</dd></div><div><dt>Verbleibender Betrag</dt><dd>{money(Math.max(0,order.totalCents-order.refundedCents))}</dd></div></>}</dl>
      </section>
      {order.downloads.length>0&&<section aria-labelledby="order-downloads"><h2 id="order-downloads">Deine Downloads</h2><ul className={styles.downloadList}>{order.downloads.map(download=><li key={download.id}><div><strong>{download.title}</strong><p>{download.state==='ready'?'Bis '+new Date(download.expiresAt).toLocaleDateString('de-DE',{timeZone:'Europe/Berlin'})+' · noch '+download.remaining+' Abrufe':download.state==='expired'?'Die siebentägige Freigabe ist abgelaufen. Bitte wende dich für Unterstützung an den Shop.':download.state==='exhausted'?'Die 20 freigegebenen Abrufe sind ausgeschöpft. Bitte wende dich für Unterstützung an den Shop.':'Nach vollständiger Erstattung ist diese Datei nicht mehr freigegeben.'}</p></div>{download.state==='ready'&&download.url&&<a href={download.url} className={styles.downloadLink}><Download size={17} aria-hidden="true"/>Datei herunterladen<span className={styles.srOnly}>: {download.title}</span></a>}</li>)}</ul></section>}
      {paid&&order.items.some(i=>i.kind==='physical')&&<section aria-labelledby="order-fulfillment"><h2 id="order-fulfillment">Lieferung</h2><p>{order.fulfillment==='fulfilled'?'Der Shop hat deine Bestellung als ausgeliefert markiert.':'Die Auslieferung wird vom Shop vorbereitet.'}</p>{order.tracking&&<p>Versandhinweis: {order.tracking}</p>}</section>}
      <div className={styles.receiptActions}>
        {order.documentUrl&&<a className={styles.downloadLink} href={order.documentUrl}><Download size={17} aria-hidden="true"/>Bestellbeleg als PDF</a>}
        {(pending||processing)&&<button type="button" disabled={!!busy} onClick={()=>void action('refresh')}><RefreshCw size={17} aria-hidden="true"/>{busy==='refresh'?'Status wird geprüft …':'Zahlungsstatus prüfen'}</button>}
        {order.checkout.canResume&&<button type="button" disabled={!!busy} onClick={()=>void action('resume')}>{busy==='resume'?'Kasse wird geprüft …':'Dieselbe Kasse fortsetzen'}</button>}
        {order.checkout.canResume&&<button className={styles.secondaryButton} type="button" disabled={!!busy} onClick={()=>void action('cancel')}>{busy==='cancel'?'Kasse wird beendet …':'Kasse beenden'}</button>}
        <a href={order.shopUrl} onClick={()=>{if(order.checkout.canRestart)try{clearCheckoutAttempt(sessionStorage,order.id);}catch{}}}>{order.checkout.canRestart?'Zum Shop und neu starten':'Zur Website'}</a>
        {withdrawalHref && <a className="ws-withdrawal-link" href={withdrawalHref}>Vertrag widerrufen</a>}
      </div>
      {notice&&<p className={styles.notice} role="status">{notice}</p>}{error&&<p className={styles.error} role="alert">{error}</p>}
      <p className={styles.receiptPrivacy}>Bewahre diesen persönlichen Bestelllink auf. Er ermöglicht Zugriff auf deinen Status und die freigegebenen Dateien.</p>
    </div>
  </main>;
}
