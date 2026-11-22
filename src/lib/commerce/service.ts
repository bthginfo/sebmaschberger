import 'server-only';
import {get as getBlob,put as putBlob} from '@vercel/blob';
import {getDraftConfig,getPublished,getRecord,getSettings,mutateRecord,setRecord} from '../db';
import {sendCommerceMail} from '../mail';
import {createCommerceService} from './engine';
import {CommerceError,emptyCommerceStore} from './model';
import {stripeValidationRejected} from './stripe-mode';

async function stripe(path:string,body?:URLSearchParams,idempotencyKey?:string){
  const key=process.env.STRIPE_SECRET_KEY;if(!key)throw new CommerceError('Die Zahlungsanbindung ist noch nicht eingerichtet.',503,'CHECKOUT_UNCONFIGURED');
  try{
    const response=await fetch('https://api.stripe.com/v1/'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+key,'Stripe-Version':'2026-10-28.endive',...(body?{'Content-Type':'application/x-www-form-urlencoded'}:{}),...(idempotencyKey?{'Idempotency-Key':idempotencyKey}:{})},body,cache:'no-store',signal:AbortSignal.timeout(20000)});
    const value=await response.json();
    if(path==='checkout/sessions'&&body&&stripeValidationRejected(response.status,value)){
      throw new CommerceError('Stripe hat die Kasse abgelehnt. Bitte prüfen Sie die Zahlungsarten und die Shop-Einrichtung.',502,'CHECKOUT_PROVIDER_REJECTED');
    }
    if(!response.ok)throw new Error('Provider rejected request');
    return value as Record<string,any>;
  }catch(error){if(error instanceof CommerceError)throw error;throw new CommerceError('Die Zahlungsanfrage konnte noch nicht bestätigt werden. Bitte dieselbe Kasse erneut öffnen; starte keine zweite Bestellung.',502,'PROVIDER_UNAVAILABLE');}
}
const service=createCommerceService({
  env:()=>process.env,getPublished,getDraftConfig,getSettings,getRecord,setRecord,
  mutate:update=>mutateRecord('commerce','state',emptyCommerceStore(),update),
  stripe,
  putAsset:(pathname,bytes,contentType,token)=>putBlob(pathname,Buffer.from(bytes),{access:'private',token,contentType,addRandomSuffix:true}),
  getAsset:(url,token)=>getBlob(url,{access:'private',token,useCache:false}),
  sendMail:sendCommerceMail,
});
export const {commerceConfig,adminSnapshot,commerceConnectionStatus,createCheckout,handleStripeEvent,attemptOrderMail,listOrders,fulfillOrder,publicOrder,orderAction,uploadDigitalAsset,digitalDownload,publicCatalog,orderDocument,adminOrderDocument}=service;

// Cache the first authorized rendering privately. Later template changes and
// refund updates never replace an already created original document.
export async function commerceDocumentPdf(id:string,key?:string){
 const {input,design}=key===undefined?await adminOrderDocument(id):await orderDocument(id,key);
 type Stored={bytes:string;sha256:string};
 let stored=await getRecord<Stored>('commerce-documents',id);
 if(!stored){const {renderConfiguredPdf}=await import('../business/service');const {createHash}=await import('node:crypto');const bytes=await renderConfiguredPdf(input,{design}),candidate={bytes:Buffer.from(bytes).toString('base64'),sha256:createHash('sha256').update(bytes).digest('hex')};stored=await mutateRecord<Stored>('commerce-documents',id,candidate,current=>current);}
 const bytes=Buffer.from(stored.bytes,'base64');const {createHash}=await import('node:crypto');if(createHash('sha256').update(bytes).digest('hex')!==stored.sha256)throw new CommerceError('Der gespeicherte Beleg konnte nicht geprüft werden.',503,'DOCUMENT_INTEGRITY');return bytes;
}
