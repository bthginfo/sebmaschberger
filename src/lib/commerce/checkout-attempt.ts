import {checkoutCartKey,COMMERCE_LIMITS} from './contracts';

export const CHECKOUT_ATTEMPT_KEY='ws-commerce-checkout:v1';
export interface CheckoutAttempt {country?:string;cart:string;key:string;previousKey?:string;previousKeys?:string[];submitted?:boolean;orderId?:string;statusUrl?:string;cartStorageKey?:string}
type StorageLike=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
export class CheckoutAttemptLimitError extends Error {constructor(){super('Zu viele unterbrochene Kassen. Bitte verwende den vorhandenen Bestelllink oder kontaktiere den Shop, bevor du eine weitere Kasse startest. Deine bisherigen Kassen wurden beibehalten.');}}
export function readCheckoutAttempt(storage:StorageLike):CheckoutAttempt|null {
  try{const a=JSON.parse(storage.getItem(CHECKOUT_ATTEMPT_KEY)||'null');if(a?.previousKeys?.length>COMMERCE_LIMITS.checkoutAncestors)throw new CheckoutAttemptLimitError();return a&&typeof a.cart==='string'&&/^[a-zA-Z0-9_-]{16,100}$/.test(a.key)&&(!a.previousKey||/^[a-zA-Z0-9_-]{16,100}$/.test(a.previousKey))&&(a.previousKeys===undefined||Array.isArray(a.previousKeys)&&a.previousKeys.every((key:unknown)=>typeof key==='string'&&/^[a-zA-Z0-9_-]{16,100}$/.test(key)))?a:null;}catch(error){if(error instanceof CheckoutAttemptLimitError)throw error;return null;}
}
export function prepareCheckoutAttempt(storage:StorageLike,items:{productId:string;variant?:string;quantity:number}[],cartStorageKey:string,uuid:()=>string=()=>crypto.randomUUID(),country?:string):CheckoutAttempt {
  const cart=checkoutCartKey(items,country),previous=readCheckoutAttempt(storage);if(previous?.cart===cart)return previous;
  // An unsent replacement has not retired its predecessor. Keep that pending
  // capability through further edits; legacy unknown markers are conservative.
  const previousKeys=[...new Set([...(previous&&previous.submitted!==false?[previous.key]:[]),...(previous?.previousKey?[previous.previousKey]:[]),...(previous?.previousKeys??[])])];
  if(previousKeys.length>COMMERCE_LIMITS.checkoutAncestors)throw new CheckoutAttemptLimitError();
  const attempt:CheckoutAttempt={cart,...(country?{country}:{}),key:uuid(),cartStorageKey,submitted:false,...(previousKeys.length?{previousKey:previousKeys[0],previousKeys}:{})};
  storage.setItem(CHECKOUT_ATTEMPT_KEY,JSON.stringify(attempt));return attempt;
}
export function saveCheckoutAttempt(storage:StorageLike,attempt:CheckoutAttempt){storage.setItem(CHECKOUT_ATTEMPT_KEY,JSON.stringify(attempt));}
export function markCheckoutAttemptSubmitted(storage:StorageLike,attempt:CheckoutAttempt):CheckoutAttempt {
  const submitted={...attempt,submitted:true};
  // This write must complete before the caller starts its POST. A failed write
  // leaves the previous durable state intact and must not start a payment call.
  saveCheckoutAttempt(storage,submitted);return submitted;
}
export function clearCheckoutAttempt(storage:StorageLike,orderId?:string,clearPurchasedCart=false){
  const attempt=readCheckoutAttempt(storage);if(orderId&&attempt?.orderId!==orderId)return;
  if(clearPurchasedCart&&attempt?.cartStorageKey){try{const cart=JSON.parse(storage.getItem(attempt.cartStorageKey)||'null');if(Array.isArray(cart?.lines)&&checkoutCartKey(cart.lines,attempt.country)===attempt.cart)storage.setItem(attempt.cartStorageKey,JSON.stringify({...cart,lines:[]}));}catch{}}
  storage.removeItem(CHECKOUT_ATTEMPT_KEY);
}
