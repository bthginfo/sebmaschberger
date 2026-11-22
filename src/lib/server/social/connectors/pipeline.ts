import {randomUUID} from 'node:crypto';
import {effectivePlatform,type PublicationRecord} from '../../../social/publishing/model';
import {publicationContentKey} from '../../../social/publishing/state';
import type {ConnectorProvider} from '../../../social/connectors/model';
import {ConnectorError,type ProviderClient,type ProviderContext,type ProviderMedia,type ProviderPost,type ProviderReceipt,type ProviderState} from './provider-contract';
import {connectorHash} from './crypto';
import type {ConnectorCipher,ConnectorRepository} from './records';
import type {createConnectorService} from './service';
import {assertNativeLease,assertNativeSource,approveNative,isNativeDelivery,nativeApprovalValid,nativeBegin,nativeCheckpoint,nativeClaim,nativeFinish,nativePause,nativeWakeActive} from './publication-state';

type Service=ReturnType<typeof createConnectorService>;
type Binding={accountId:string;accountGeneration:number;appRevision:number;platform:ConnectorProvider;brandKey:string;contentHash:string};
export type NativePipelineDependencies={
 repo:ConnectorRepository;cipher:ConnectorCipher;service:Service;clients:Record<ConnectorProvider,ProviderClient>;
 now:()=>string;ready:()=>Promise<boolean>;epochValid:(id:string)=>Promise<boolean>;
 load:(id:string)=>Promise<PublicationRecord|null>;
 update:(id:string,work:(entry:PublicationRecord)=>PublicationRecord)=>Promise<PublicationRecord>;
 media:(entry:PublicationRecord)=>Promise<ProviderMedia|null>;
 mediaUrl:(entry:PublicationRecord,at:string)=>Promise<string>;
 mediaUrls?:(entry:PublicationRecord,at:string)=>Promise<string[]>;
 dispatch:(id:string)=>Promise<unknown>;
};

/** Separate native state machine: legacy Instagram records never enter these drivers. */
export function createNativePipeline(deps:NativePipelineDependencies){
 const post=(entry:PublicationRecord):ProviderPost=>({id:entry.id,generation:entry.generation,kind:entry.kind,...(entry.carousel?{carousel:true as const,carouselAltTexts:entry.carouselAltTexts}:{}),caption:entry.caption,altText:entry.altText,title:entry.source.title,scheduledAt:entry.scheduledAt!,providerOptions:entry.providerOptions});
 async function access(entry:PublicationRecord){
  if(!entry.accountId)throw new ConnectorError('Bitte zuerst ein Zielkonto auswählen.');
  const value=await deps.service.access(entry.accountId),account=value.account.view;
  if(account.platform!==effectivePlatform(entry)||account.brandKey!==entry.source.brandKey||entry.approval&&entry.approval.connectionGeneration!==account.generation)throw new ConnectorError('Kanal, Marke oder Kontofreigabe haben sich geändert. Bitte neu prüfen.','permission');
  return value;
 }
 async function preflight(entry:PublicationRecord){
  if(!await deps.ready())throw new ConnectorError('Der automatische Versand ist noch nicht vollständig eingerichtet. Planung und Export bleiben nutzbar.','configuration');
  assertNativeSource(entry);const a=await access(entry),client=deps.clients[a.account.view.platform],media=await deps.media(entry);
  client.validate(post(entry),media);
  const target=await client.check({app:a.app,session:a.session,target:a.account.target});
  if(target.id!==a.account.target.id||target.kind!==a.account.target.kind)throw new ConnectorError('Der Anbieter bestätigt ein anderes Zielkonto. Bitte erneut verbinden.','permission');
  if(a.session.refreshExpiresAt&&Math.max(Date.parse(a.session.expiresAt??deps.now()),Date.parse(a.session.refreshExpiresAt))<Date.parse(entry.scheduledAt!)+3600000)throw new ConnectorError('Die zeitlich begrenzte Kontofreigabe endet vor diesem Termin. Bitte beim Anbieter erneut anmelden.','expired');
  if(!a.account.view.renewable&&!a.session.nonExpiring&&(!a.session.expiresAt||Date.parse(a.session.expiresAt)<Date.parse(entry.scheduledAt!)+3600000))throw new ConnectorError('Dieser Zugang deckt den gewählten Termin nicht ab. Bitte zuerst erneut verbinden.','expired');
  return a.account.view.generation;
 }
 async function approved(entry:PublicationRecord,actor:string){approveNative(entry,actor,1,deps.now());const generation=await preflight(entry);return approveNative(entry,actor,generation,deps.now());}
 async function validate(entry:PublicationRecord,token?:string){
  if(!isNativeDelivery(entry)||!nativeApprovalValid(entry)||!await deps.ready()||!await deps.epochValid(entry.id))throw new ConnectorError('Diese Freigabe ist nicht mehr aktiv. Bitte vor dem Versand erneut prüfen.','permission');
  if(token)assertNativeLease(entry,entry.generation,token);
  const value=await access(entry);
  if(token&&entry.process.phase==='publish'&&entry.process.publishStartedAt&&(value.account.sendLease?.token!==token||Date.parse(value.account.sendLease.until)<Date.parse(deps.now())+35000))throw new ConnectorError('Die sichere Übergabezeit ist abgelaufen. Bitte den Anbieterstatus prüfen.','ambiguous');
  return value;
 }
 async function context(entry:PublicationRecord,token?:string,review=false):Promise<{context:ProviderContext;client:ProviderClient}>{
  const a=review?await access(entry):await validate(entry,token),client=deps.clients[a.account.view.platform],media=await deps.media(entry);
  client.validate(post(entry),media);
  const binding:Binding={accountId:a.account.view.id,accountGeneration:a.account.view.generation,appRevision:a.account.appRevision,platform:a.account.view.platform,brandKey:entry.source.brandKey,contentHash:connectorHash(publicationContentKey(entry,entry.media))},jobId=entry.id+':'+entry.generation;
  const job=await deps.repo.get('jobs',jobId),privateJob=job?deps.cipher.open<{binding:Binding;state:ProviderState}>('job',jobId,job.stateCiphertext):null;
  if(privateJob&&JSON.stringify(privateJob.binding)!==JSON.stringify(binding))throw new ConnectorError('Der gespeicherte Anbieterauftrag gehört zu einem anderen Freigabestand.','permission');
  if(review&&!privateJob)throw new ConnectorError('Für diesen Versuch ist kein prüfbarer Anbieterauftrag gespeichert.');
  const ctx:ProviderContext={app:a.app,session:a.session,target:a.account.target,post:post(entry),media,mediaUrl:entry.media&&!review?await deps.mediaUrl(entry,deps.now()):null,...(entry.carousel&&!review?{mediaUrls:await deps.mediaUrls?.(entry,deps.now())}:{}),now:deps.now(),key:jobId,state:privateJob?.state??{},checkpoint:async state=>{
   const fresh=await deps.load(entry.id);
   if(!fresh||fresh.generation!==entry.generation||connectorHash(publicationContentKey(fresh,fresh.media))!==binding.contentHash||!review&&fresh.lease?.token!==token)throw new ConnectorError('Dieser Anbieterauftrag wurde inzwischen geändert.');
   if(!review)await validate(fresh,token);
   const stateCiphertext=deps.cipher.seal('job',jobId,{binding,state});
   await deps.repo.mutate('jobs',jobId,previous=>{if(previous&&previous.generation!==entry.generation)throw new ConnectorError('Der gespeicherte Auftrag hat einen anderen Stand.');return{id:jobId,publicationId:entry.id,generation:entry.generation,stateCiphertext,updatedAt:deps.now()};});ctx.state=state;
  }};
  if(!job&&!review)await ctx.checkpoint({});
  return{context:ctx,client};
 }
 async function finish(id:string,generation:number,token:string,receipt:ProviderReceipt){
  return deps.update(id,current=>{assertNativeLease(current,generation,token);return nativeFinish(current,receipt,deps.now());});
 }
 async function tick(id:string,generation:number){
  let entry=await deps.load(id);if(!entry||entry.generation!==generation||!isNativeDelivery(entry))return;
  if(entry.approval&&!nativeApprovalValid(entry)){await deps.update(id,current=>current.generation===generation?nativePause(current,'Die Inhalte stimmen nicht mehr mit der Freigabe überein. Bitte erneut prüfen.',deps.now()):current);return;}
  if(!nativeWakeActive(entry))return;
  if(Date.parse(entry.nextActionAt!)>Date.parse(deps.now())+1000)return;
  const token=randomUUID();entry=await deps.update(id,current=>nativeClaim(current,generation,token,deps.now()));if(entry.lease?.token!==token)return;
  let sendAccount:string|null=null;
  try{
   const {context:ctx,client}=await context(entry,token);
   if(entry.process.phase==='review'){
    if(!entry.process.publishStartedAt)throw new ConnectorError('Dieser Auftrag braucht eine ausdrückliche Prüfung.');
    const receipt=await client.reconcile(ctx);
    if(!receipt||receipt.outcome==='pending'){
     if(entry.process.polls>=29)throw new ConnectorError('Der Anbieter bestätigt die Übergabe noch nicht. Bitte den Status vor einem neuen Versuch prüfen.');
     await deps.update(id,current=>nativeCheckpoint(current,generation,token,{phase:'review',polls:current.process.polls+1},new Date(Date.parse(deps.now())+60000).toISOString(),deps.now()));
    }else await finish(id,generation,token,receipt);
   }else if(entry.process.phase==='create'||entry.process.phase==='poll'){
    const step=entry.process.phase==='create'?await client.prepare(ctx):await client.poll(ctx),now=deps.now();
    if(!step.ready&&entry.process.polls>=29)throw new ConnectorError('Die Verarbeitung dauert länger als erwartet. Bitte den Anbieterstatus prüfen.');
    await deps.update(id,current=>nativeCheckpoint(current,generation,token,{phase:step.ready?'publish':'poll',containerId:current.process.containerId??'native:'+id+':'+generation,containerCreatedAt:current.process.containerCreatedAt??now,polls:current.process.polls+1,lastError:null},new Date(step.ready?Math.max(Date.parse(current.scheduledAt!),Date.parse(now)):Date.parse(now)+Math.max(1000,Math.min(step.retryAfterMs??60000,120000))).toISOString(),now));
   }else if(entry.process.phase==='publish'){
    sendAccount=entry.accountId!;
    // Both app and account are fenced before the irreversible request. Every
    // asynchronous media/token check is followed by a fresh publication read.
    await deps.service.acquireSend(sendAccount,id,token);
    entry=await deps.update(id,current=>nativeBegin(current,generation,token,deps.now()));
    const freshContext=await context(entry,token);await deps.service.acquireSend(sendAccount,id,token);
    const latest=await deps.load(id);if(!latest)throw new ConnectorError('Dieser Auftrag fehlt.');await validate(latest,token);
    const receipt=await freshContext.client.publish(freshContext.context);await finish(id,generation,token,receipt);
   }else throw new ConnectorError('Der gespeicherte Verarbeitungsschritt ist ungültig.');
  }catch(error){
   const current=await deps.load(id);
   if(current?.generation===generation&&current.lease?.token===token){
    const reason=error instanceof ConnectorError?error.message:'Dieser Schritt konnte nicht sicher bestätigt werden. Bitte Verbindung und Anbieterstatus prüfen.';
    if(!current.process.publishStartedAt&&error instanceof ConnectorError&&error.kind==='transient'&&current.process.polls<4){
     await deps.update(id,value=>nativeCheckpoint(value,generation,token,{polls:value.process.polls+1,lastError:reason},new Date(Date.parse(deps.now())+60000).toISOString(),deps.now()));
    }else await deps.update(id,value=>value.generation===generation&&value.lease?.token===token?nativePause(value,reason,deps.now()):value);
   }
  }finally{
   if(sendAccount)await deps.service.releaseSend(sendAccount,token);
  }
  const next=await deps.load(id);if(next&&nativeWakeActive(next)&&!next.lease)await deps.dispatch(id);
 }
 async function reconcile(entry:PublicationRecord){
  if(!isNativeDelivery(entry)||entry.status!=='needs_review'||entry.process.containerId!=='native:'+entry.id+':'+entry.generation||!entry.process.publishStartedAt||entry.lease)throw new ConnectorError('Für diesen Eintrag gibt es keinen unklaren Versand zu prüfen.');
  const {context:ctx,client}=await context(entry,undefined,true),receipt=await client.reconcile(ctx);
  if(!receipt||receipt.outcome==='pending')throw new ConnectorError('Der Anbieter bestätigt noch keinen Abschluss. Es wurde nichts erneut gesendet. Bitte den Stand im Konto prüfen.');
  return nativeFinish(entry,receipt,deps.now());
 }
 return{approved,preflight,tick,reconcile,validate};
}
