import type {OrderBusinessSnapshot} from '../business/settings';
import {quoteCommerce,PricingError} from './pricing';
import {createHmac,timingSafeEqual} from 'node:crypto';
import type {SiteModules} from '../types';
import {COMMERCE_LIMITS} from './contracts';
import type {StripeMode} from './stripe-mode';

export interface CartLine {productId:string;variant?:string;quantity:number}
export interface OrderLine extends CartLine {title:string;kind:'physical'|'digital'|'service';taxRate?:number;taxNote?:string;unitPriceCents:number;stock?:number}
export type OrderStatus='pending'|'processing'|'paid'|'expired'|'failed'|'refunded';
export interface CommerceOrder {
  paidAt?:string;business?:OrderBusinessSnapshot;billing?:{name:string;address:string};documentNumber?:string;documentIssuedAt?:string;
  id:string;requestKey:string;requestDigest:string;createdAt:string;expiresAt:string;status:OrderStatus;currency:'EUR';items:OrderLine[];
  subtotalCents:number;shippingCents:number;totalCents:number;netCents?:number;taxCents?:number;taxGroups?:{rate:number;netCents:number;taxCents:number;grossCents:number}[];shippingTaxRate?:number;shippingCountry?:string;shippingZoneName?:string;stripeSessionId?:string;stripePaymentIntent?:string;checkoutUrl?:string;
  checkoutRequest?:string;checkoutAttemptedAt?:string;checkoutFirstAttempt?:string;paymentMode?:StripeMode;checkoutFailure?:'provider-rejected';email?:string;shipping?:unknown;refundedCents?:number;refundStatus?:'none'|'partial'|'full';
  fulfillment:'pending'|'fulfilled';fulfilledAt?:string;tracking?:string;
  mail:{status:'pending'|'sending'|'sent'|'failed'|'not-configured';kind:'paid'|'refunded'|'partial-refund';attempts:number;leaseUntil?:string;leaseId?:string;refundedCents?:number};
  grants:{id:string;productId:string;expiresAt:string;downloads:number}[];
}
export interface CommerceStore {documentNumbers?:Record<string,number>;orders:CommerceOrder[];events:Record<string,string>}
export const emptyCommerceStore=():CommerceStore=>({orders:[],events:{}});
export class CommerceError extends Error {constructor(message:string,public status=400,public code='COMMERCE_INVALID'){super(message);}}
export function normalizeCart(cart:CartLine[]):CartLine[]{
  if(!cart.length||cart.length>30)throw new CommerceError('Bitte wähle ein bis 30 Produkte.');
  const combined=new Map<string,CartLine>();
  for(const line of cart){
    if(typeof line.productId!=='string'||!line.productId||line.productId.length>COMMERCE_LIMITS.productId||line.variant!==undefined&&(typeof line.variant!=='string'||line.variant.length>COMMERCE_LIMITS.variant)||!Number.isInteger(line.quantity)||line.quantity<1||line.quantity>20)throw new CommerceError('Bitte prüfe Produkt, Variante und Menge.');
    const key=JSON.stringify([line.productId,line.variant||'']);const current=combined.get(key);
    const quantity=(current?.quantity??0)+line.quantity;if(quantity>20)throw new CommerceError('Es sind höchstens 20 Exemplare pro Variante möglich.');
    combined.set(key,{productId:line.productId,variant:line.variant||undefined,quantity});
  }
  return [...combined.values()];
}
export function priceCart(config:NonNullable<SiteModules['commerce']>,cart:CartLine[],country?:string){if(!config.enabled)throw new CommerceError('Der Shop nimmt gerade keine neuen Bestellungen an.',404,'SALES_DISABLED');try{return quoteCommerce(config,normalizeCart(cart),country);}catch(error){if(error instanceof PricingError)throw new CommerceError(error.message,409,error.code);throw error;}}
export function allocatedStock(store:CommerceStore,productId:string,now=Date.now()):number {
  return store.orders.filter(o=>(o.status==='pending'&&(Boolean(o.stripeSessionId)||Boolean(o.checkoutAttemptedAt)||Date.parse(o.expiresAt)>now))||['processing','paid','refunded'].includes(o.status)).flatMap(o=>o.items).filter(i=>i.productId===productId).reduce((n,i)=>n+i.quantity,0);
}
export function reserveOrder(store:CommerceStore,order:CommerceOrder,now=Date.now()):CommerceStore {
  const existing=store.orders.find(o=>o.requestKey===order.requestKey);if(existing){if(existing.requestDigest!==order.requestDigest)throw new CommerceError('Dieser Bestellschlüssel gehört zu einem anderen Warenkorb.',409,'ATTEMPT_CART_MISMATCH');return store;}
  if(store.orders.length>=5000)throw new CommerceError('Bitte kontaktiere den Shop, bevor du bestellst.',503,'ARCHIVE_FULL');
  for(const line of order.items){if(line.stock===undefined)continue;const requested=order.items.filter(i=>i.productId===line.productId).reduce((n,i)=>n+i.quantity,0);if(allocatedStock(store,line.productId,now)+requested>line.stock)throw new CommerceError('Ein Produkt ist in dieser Menge nicht mehr verfügbar. Bitte aktualisiere den Warenkorb.',409,'OUT_OF_STOCK');}
  return {...store,orders:[order,...store.orders]};
}
export interface VerifiedPaymentEvent {id:string;type:'paid'|'processing'|'expired'|'failed'|'refunded';orderId:string;sessionId?:string;paymentIntent?:string;amountCents?:number;refundedCents?:number;currency?:string;email?:string;shipping?:unknown;grants?:CommerceOrder['grants'];billing?:{name:string;address:string}}
export function applyPaymentEvent(store:CommerceStore,event:VerifiedPaymentEvent,now=Date.now()):CommerceStore {
  if(store.events[event.id])return store;const order=store.orders.find(o=>o.id===event.orderId);if(!order)throw new CommerceError('Die Bestellung wurde nicht gefunden.',409);
  if(event.sessionId&&order.stripeSessionId&&event.sessionId!==order.stripeSessionId||event.paymentIntent&&order.stripePaymentIntent&&event.paymentIntent!==order.stripePaymentIntent)throw new CommerceError('Die Zahlung gehört nicht zu dieser Bestellung.',409,'PAYMENT_MISMATCH');
  if(event.type==='paid'&&(event.amountCents!==order.totalCents||event.currency?.toUpperCase()!==order.currency))throw new CommerceError('Zahlbetrag oder Währung stimmen nicht überein.',409,'PAYMENT_MISMATCH');
  if(event.type==='refunded'&&(event.refundedCents!==undefined&&(!Number.isInteger(event.refundedCents)||event.refundedCents<0||event.refundedCents>order.totalCents)||event.currency!==undefined&&event.currency.toUpperCase()!==order.currency))throw new CommerceError('Die Erstattung passt nicht zu dieser Bestellung.',409,'PAYMENT_MISMATCH');
  const events={...store.events,[event.id]:new Date(now).toISOString()};if(Object.keys(events).length>15000)throw new CommerceError('Das Zahlungsarchiv benötigt Wartung.',503,'ARCHIVE_FULL');
  const documentNumbers={...store.documentNumbers};
  return {...store,events,documentNumbers,orders:store.orders.map(o=>{
    if(o.id!==order.id)return o;
    const identity={stripeSessionId:event.sessionId||o.stripeSessionId,stripePaymentIntent:event.paymentIntent||o.stripePaymentIntent};const customer={email:event.email||o.email,shipping:event.shipping??o.shipping,billing:o.billing||event.billing};
    if(event.type==='refunded'){
      const refundedCents=Math.max(o.refundedCents??(o.status==='refunded'?o.totalCents:0),event.refundedCents??o.totalCents);const full=refundedCents>=o.totalCents;const changed=refundedCents>(o.refundedCents??0);
      return {...o,...identity,...customer,refundedCents,refundStatus:full?'full':'partial',status:full?'refunded':o.status,grants:full?[]:o.grants,mail:changed&&['paid','refunded'].includes(full?'refunded':o.status)?{status:'pending',kind:full?'refunded':'partial-refund',attempts:0,refundedCents}:o.mail};
    }
    if(event.type==='paid'){
      if(o.status==='refunded'||o.status==='paid')return {...o,...identity,...customer};
      const partial=(o.refundedCents??0)>0;let documentNumber=o.documentNumber,documentIssuedAt=o.documentIssuedAt;
      if(!documentNumber&&o.business?.invoiceEnabled&&customer.billing?.name&&customer.billing.address){const year=new Intl.DateTimeFormat('en',{year:'numeric',timeZone:'Europe/Berlin'}).format(new Date(now)),next=(documentNumbers[year]||0)+1;if(!Number.isSafeInteger(next)||next>99999999)throw new CommerceError('Der Rechnungsnummernkreis muss geprüft werden.',503);documentNumbers[year]=next;documentNumber='SHOP-'+year+'-'+String(next).padStart(5,'0');documentIssuedAt=new Date(now).toISOString();}
      return {...o,...identity,...customer,documentNumber,documentIssuedAt,paidAt:o.paidAt||new Date(now).toISOString(),status:'paid',refundStatus:partial?'partial':'none',grants:event.grants||[],mail:{status:'pending',kind:partial?'partial-refund':'paid',attempts:0,refundedCents:o.refundedCents}};
    }
    if(event.type==='processing'&&o.status==='pending')return {...o,...identity,...customer,status:'processing'};
    if(event.type==='expired'&&o.status==='pending')return {...o,status:'expired'};
    if(event.type==='failed'&&(o.status==='pending'||o.status==='processing'))return {...o,status:'failed'};
    return o;
  })};
}
export function verifyStripeSignature(body:string,header:string,secret:string,now=Date.now()):boolean {
  const fields=header.split(',').map(s=>s.split('='));const timestamp=fields.find(([key])=>key==='t')?.[1];if(!timestamp||!/^\d+$/.test(timestamp)||Math.abs(now/1000-Number(timestamp))>300)return false;
  const expected=createHmac('sha256',secret).update(timestamp+'.'+body).digest();return fields.some(([key,value])=>key==='v1'&&!!value&&/^[a-f0-9]{64}$/i.test(value)&&timingSafeEqual(expected,Buffer.from(value,'hex')));
}
export function signAccess(value:string,secret:string){return createHmac('sha256',secret).update(value).digest('base64url');}
export function validAccess(value:string,signature:string,secret:string){const expected=signAccess(value,secret);return /^[a-zA-Z0-9_-]{43}$/.test(signature)&&signature.length===expected.length&&timingSafeEqual(Buffer.from(signature),Buffer.from(expected));}
