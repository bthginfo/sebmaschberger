import type {CommerceOrder, OrderStatus} from './model';

export const COMMERCE_LIMITS = {productId:150, variant:100, minPriceCents:50, maxTotalCents:99999999, maxFileBytes:4*1024*1024, checkoutAncestors:20} as const;
export interface CommerceSetupCheck {id:string;label:string;state:'ready'|'missing'|'unverified'|'off';detail:string;required:boolean}
export interface CommerceConnectionStatus {checkout:boolean;card:boolean;paypal:boolean;privateDownloads:boolean;message:string;salesEnabled:boolean;draftEnabled:boolean;mailReady:boolean;paypalStatus:'off'|'unverified';checks:CommerceSetupCheck[]}
export interface CommerceAssetStatus {productId:string;status:'ready'|'missing';filename?:string;contentType?:string;createdAt?:string;size?:number}
export interface CommerceInventory {productId:string;capacity?:number;allocated:number;available?:number}
export interface CommerceAdminSnapshot {orders:CommerceOrder[];connection:CommerceConnectionStatus;assets:CommerceAssetStatus[];inventory:CommerceInventory[]}
export type CheckoutState='open'|'processing'|'complete'|'terminal';
export interface CheckoutResult {state:CheckoutState;orderId:string;statusUrl:string;url?:string;expiresAt:string;canRestart:boolean}
export interface PublicCommerceOrder {
  statisticsProof?:string;
  documentUrl?:string;netCents?:number;taxCents?:number;
  id:string;status:OrderStatus;statusLabel:string;totalCents:number;subtotalCents:number;shippingCents:number;currency:'EUR';refundedCents:number;refundStatus:'none'|'partial'|'full';fulfillment:'pending'|'fulfilled';fulfilledAt?:string;tracking?:string;
  items:{productId:string;title:string;quantity:number;variant?:string;kind:'physical'|'digital'|'service';unitPriceCents:number}[];
  downloads:{id:string;productId:string;title:string;state:'ready'|'expired'|'exhausted'|'revoked';url?:string;expiresAt:string;remaining:number}[];
  checkout:{state:CheckoutState;canResume:boolean;canRestart:boolean};shopUrl:string;
}
export function commerceStatusLabel(order:Pick<CommerceOrder,'status'|'refundedCents'|'refundStatus'>):string {
  if(order.status==='paid'&&(order.refundedCents??0)>0)return 'Teilweise erstattet';
  return ({pending:'Zahlung offen',processing:'Zahlung wird bestätigt',paid:'Bezahlt',expired:'Kasse abgelaufen',failed:'Zahlung fehlgeschlagen',refunded:'Vollständig erstattet'} as const)[order.status];
}
export function checkoutCartKey(items:{productId:string;variant?:string;quantity:number}[],country?:string):string {
  const key=JSON.stringify(items.map(i=>({productId:i.productId,variant:i.variant||undefined,quantity:i.quantity})).sort((a,b)=>JSON.stringify([a.productId,a.variant]).localeCompare(JSON.stringify([b.productId,b.variant]))));return country?JSON.stringify({items:JSON.parse(key),country}):key;
}
export function commerceSiteOrigin(value:string,allowLocal=false):string|null {
  try{const url=new URL(value);if(url.username||url.password||url.search||url.hash||url.pathname!=='/')return null;
    if(url.protocol==='https:'&&url.hostname&&!['localhost','127.0.0.1','[::1]'].includes(url.hostname))return url.origin;
    if(allowLocal&&url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname))return url.origin;
  }catch{}return null;
}
