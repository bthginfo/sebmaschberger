import type {CommerceOrder} from './model';
import type {BusinessDocument} from '../business/pdf';
import type {DocumentDesign} from '../business/design';
export function orderBusinessDocument(order:CommerceOrder,design:DocumentDesign):BusinessDocument{
 const profile=order.business?.profile,invoice=Boolean(order.documentNumber&&profile&&order.billing?.name&&order.billing.address);
 const shipping=order.shippingCents?[{description:'Versand'+(order.shippingZoneName?' · '+order.shippingZoneName:''),quantity:1,unitPriceCents:order.shippingCents,taxRate:order.shippingTaxRate||0}]:[];
 const notes=['Online-Zahlung bestätigt.',...new Set(order.items.map(i=>i.taxNote).filter((n):n is string=>Boolean(n)))];
 return{kind:invoice?'invoice':'receipt',number:order.documentNumber||'BESTELLUNG-'+order.id,title:invoice?'Rechnung zu Ihrer Bestellung':'Beleg zu Ihrer Bestellung',issuedAt:order.documentIssuedAt||order.paidAt||order.createdAt,priceMode:'gross',supplier:{name:profile?.name||design.brandName,address:profile?.address||'',email:profile?.email||'',phone:profile?.phone,taxId:profile?.taxId,iban:profile?.iban},buyer:{name:order.billing?.name||'Bestellung '+order.id,address:order.billing?.address||''},items:[...order.items.map(i=>({description:i.title+(i.variant?' · '+i.variant:''),quantity:i.quantity,unitPriceCents:i.unitPriceCents,taxRate:i.taxRate||0})),...shipping],notes,taxExemptNote:profile?.taxMode==='small_business'?'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.':order.taxCents===undefined?'Steuerausweis nicht eingerichtet. Dieser Bestellbeleg ersetzt keine separate Steuerrechnung.':undefined};
}
