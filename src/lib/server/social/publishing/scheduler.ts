import {nativePause,isNativeDelivery,nativeWakeActive} from '../connectors/publication-state';
import {isAutomaticInstagram,isReferenceSource,QUEUE_HORIZON_SECONDS,QUEUE_RETENTION_SECONDS,type PublicationRecord} from '@/lib/social/publishing/model';
import {beginPublish,checkpointPublication,claimPublication,confirmPublication,failPublication,markQueued,pausePublication as pauseLegacy,publicationContentKey} from '@/lib/social/publishing/state';
import {InstagramError} from './instagram';
import {assertPublishingSource,connectionCredentials,PlannerError,publicConnection,publishingHash,wakeFor,type PublishingDependencies,type StoredPublication,type WakeIntent} from './types';

const pausePublication=(entry:PublicationRecord,reason:string,at:string)=>isNativeDelivery(entry)?nativePause(entry,reason,at):pauseLegacy(entry,reason,at);
export type PublishingTick={publicationId:string;generation:number;wakeId:string};
export type SchedulerDependencies=PublishingDependencies&{
 nativeMaintenance?:()=>Promise<unknown>;nativeTick?:(id:string,generation:number)=>Promise<void>;uuid:()=>string;providerUrl:(entry:PublicationRecord,at:string)=>Promise<string>;
 enqueue:(message:PublishingTick,options:{delaySeconds:number;retentionSeconds:number;idempotencyKey:string})=>Promise<{messageId:string|null}>;
};
const active=(entry:PublicationRecord)=>nativeWakeActive(entry)||Boolean(isAutomaticInstagram(entry)&&!isReferenceSource(entry.source)&&entry.kind!=='text'&&entry.approval&&entry.nextActionAt&&['scheduling','scheduled','processing'].includes(entry.status));
class WakeEnqueueError extends Error{}

function wakeStillQueued(wake: WakeIntent, at: string) {
  return Boolean(wake.queuedAt && Date.parse(at) < Math.max(Date.parse(wake.at), Date.parse(wake.queuedAt)) + 5 * 60000);
}

export function createPublishingScheduler(deps:SchedulerDependencies){
 const {repo}=deps;
 async function pause(row:StoredPublication,reason:string){return repo.mutatePublication(row.entry.id,current=>current?{...current,entry:pausePublication(current.entry,reason,deps.now()),approvedEpoch:null,wake:null}:row);}
 async function dispatch(id:string){
  const row=await repo.publication(id);if(!row||!row.wake||!active(row.entry))return row?.entry??null;
  const at=deps.now(),ready=await deps.readiness();if(!ready.enabled)return(await pause(row,'Der Post-Planer wurde ausgeschaltet. Bitte nach dem Einschalten bewusst neu freigeben.')).entry;
  if(!ready.queue)return row.entry;
  if(Date.parse(row.wake.at)>Date.parse(at)+QUEUE_HORIZON_SECONDS*1000)return row.entry;
  if(wakeStillQueued(row.wake,at))return row.entry;
  if(row.wake.dispatchLease&&Date.parse(row.wake.dispatchLease.until)>Date.parse(at))return row.entry;
  const token=deps.uuid(),wakeId=row.wake.id;
  const claimed=await repo.mutatePublication(id,current=>{
   if(!current||current.wake?.id!==wakeId||!active(current.entry))return current??row;
   if(current.wake.dispatchLease&&Date.parse(current.wake.dispatchLease.until)>Date.parse(at))return current;
   if(wakeStillQueued(current.wake,at))return current;
   const previous=current.wake;
   // A confirmed old message keeps its Queue idempotency key until retention expires.
   // Persist a new attempt once. Ambiguous retries reuse that attempt's key.
   const wake=previous.queuedAt
    ?{...previous,queuedAt:null,messageId:null,dispatchAttempt:(previous.dispatchAttempt??0)+1}
    :previous;
   return{...current,wake:{...wake,dispatchLease:{token,until:new Date(Date.parse(at)+90000).toISOString()}}};
  });if(claimed.wake?.dispatchLease?.token!==token)return claimed.entry;
  try{
   const receipt=await deps.enqueue({publicationId:id,generation:claimed.entry.generation,wakeId},{delaySeconds:Math.max(0,Math.ceil((Date.parse(claimed.wake.at)-Date.parse(at))/1000)),retentionSeconds:QUEUE_RETENTION_SECONDS,idempotencyKey:'publication:'+wakeId+(claimed.wake.dispatchAttempt?':'+claimed.wake.dispatchAttempt:'')});
   const saved=await repo.mutatePublication(id,current=>{
    if(!current||current.wake?.id!==wakeId||current.wake.dispatchLease?.token!==token)return current??claimed;
    const entry=receipt.messageId?(nativeWakeActive(current.entry)&&current.entry.status==='scheduling'?{...current.entry,status:'scheduled' as const,revision:current.entry.revision+1,updatedAt:deps.now()}:markQueued(current.entry,current.entry.generation,deps.now())):current.entry;
    return{...current,entry,wake:{...current.wake,queuedAt:deps.now(),messageId:receipt.messageId,dispatchLease:null}};
   });return saved.entry;
  }catch{
   const saved=await repo.mutatePublication(id,current=>current&&current.wake?.id===wakeId&&current.wake.dispatchLease?.token===token?{...current,entry:{...current.entry,process:{...current.entry.process,lastError:'Die Warteschlange hat den Auftrag noch nicht bestätigt. Die gespeicherte Freigabe wird über den Wiederherstellungslauf erneut vorgemerkt.'}},wake:{...current.wake,dispatchLease:null}}:current??claimed);return saved.entry;
  }
 }
 async function validate(row:StoredPublication){
  const entry=row.entry,at=deps.now(),ready=await deps.readiness();
   if(!isAutomaticInstagram(entry)||isReferenceSource(entry.source)||entry.kind==='text')throw new PlannerError('Dieser Eintrag wird manuell geplant und kann nicht an Instagram übergeben werden.');
  if(!ready.enabled)throw new PlannerError('Der Post-Planer wurde ausgeschaltet. Bitte nach dem Einschalten neu freigeben.');
  if(!ready.queue||!ready.media||!ready.publicOrigin||ready.credentials===false)throw new PlannerError('Die Veröffentlichung ist technisch nicht mehr vollständig eingerichtet. Bitte prüfen und neu freigeben.');
  if(row.approvedEpoch!==await repo.epoch())throw new PlannerError('Der Post-Planer war ausgeschaltet. Dieser Beitrag braucht eine neue Freigabe.');
  if(!entry.approval||!entry.media||entry.approval.mediaHash!==entry.media.sha256||entry.approval.contentHash!==publishingHash(publicationContentKey(entry,entry.media)))throw new PlannerError('Die freigegebenen Inhalte oder Medien stimmen nicht mehr überein. Bitte erneut prüfen.');
  assertPublishingSource(row);
  const connection=entry.accountId?await repo.connection(entry.accountId):null;
  if(!connection||publicConnection(connection,at).status!=='connected'||connection.view.generation!==entry.approval.connectionGeneration||connection.view.brandKey!==entry.source.brandKey)throw new PlannerError('Die Instagram-Verbindung wurde geändert oder ist abgelaufen. Bitte erneut verbinden und bewusst freigeben.');
  await deps.verifyMedia(row);return{connection,credentials:connectionCredentials(connection,deps.decrypt,at)};
 }
 async function tick(message:PublishingTick){
  const initial=await repo.publication(message.publicationId);if(!initial||initial.entry.generation!==message.generation||!active(initial.entry))return;
  if(initial.wake?.id!==message.wakeId){await dispatch(initial.entry.id);await ensureNextIntent(initial.entry.id);return;}
  if(isNativeDelivery(initial.entry)){
   if(!deps.nativeTick){await pause(initial,'Dieser Connector ist nicht eingerichtet. Bitte vor einem Versand prüfen.');return;}
   await deps.nativeTick(initial.entry.id,message.generation);
   await ensureNextIntent(initial.entry.id);
   return;
  }
  if(!(await deps.readiness()).enabled){await pause(initial,'Der Post-Planer wurde ausgeschaltet. Eine erneute Freigabe ist erforderlich.');return;}
  if(Date.parse(initial.entry.nextActionAt!)>Date.parse(deps.now())+1000)return;
  const token=deps.uuid(),at=deps.now();
  const claimed=await repo.mutatePublication(message.publicationId,current=>{
   if(!current||current.entry.generation!==message.generation||current.wake?.id!==message.wakeId)return current??initial;
   const entry=claimPublication(current.entry,message.generation,token,at);return entry?{...current,entry,wake:entry.status==='needs_review'?null:current.wake}:current;
  });if(claimed.entry.lease?.token!==token)return;
  try{
   const {credentials}=await validate(claimed),entry=claimed.entry;
   if(entry.process.phase==='create'){
    const quota=await deps.driver.quota(credentials);if(quota.total===null||quota.usage>=quota.total)throw new PlannerError('Das aktuelle Instagram-Limit ist nicht ausreichend oder konnte nicht bestätigt werden. Bitte später prüfen.');
    const url=await deps.providerUrl(entry,deps.now());await validate(claimed);
    const containerId=entry.kind==='image'?await deps.driver.createImage(credentials,{url,caption:entry.caption,altText:entry.altText}):await deps.driver.createReel(credentials,{url,caption:entry.caption});
    await checkpoint(entry,{phase:'poll',containerId,containerCreatedAt:deps.now(),polls:0},new Date(Date.parse(deps.now())+60000).toISOString());
   }else if(entry.process.phase==='poll'){
    if(!entry.process.containerId)throw new PlannerError('Die gespeicherte Instagram-Containerkennung fehlt. Bitte neu prüfen.');
    const status=await deps.driver.status(credentials,entry.process.containerId);
    if(status==='PUBLISHED'){await confirm(entry,null);return;}
    if(status==='ERROR'||status==='EXPIRED')throw new PlannerError('Instagram konnte die Medien nicht verarbeiten oder der Container ist abgelaufen. Bitte Medien und Zeitpunkt prüfen.');
    if(status==='FINISHED')await checkpoint(entry,{phase:'publish'},new Date(Math.max(Date.parse(entry.scheduledAt!),Date.parse(deps.now()))).toISOString());
    else if(entry.process.polls>=4)throw new PlannerError('Instagram verarbeitet die Medien nach fünf Minuten noch nicht fertig. Bitte den Stand im Konto prüfen und bei Bedarf einen neuen Termin freigeben.');
    else await checkpoint(entry,{polls:entry.process.polls+1},new Date(Date.parse(deps.now())+60000).toISOString());
   }else if(entry.process.phase==='publish'){
    if(!entry.process.containerId||!entry.scheduledAt||Date.parse(entry.scheduledAt)>Date.parse(deps.now())+1000)throw new PlannerError('Der bestätigte Veröffentlichungszeitpunkt ist noch nicht erreicht.');
    const fresh=await repo.publication(entry.id);if(!fresh||fresh.entry.lease?.token!==token)return;await validate(fresh);
    const started=await repo.mutatePublication(entry.id,current=>{
     if(!current||current.entry.lease?.token!==token||current.entry.generation!==message.generation)return current??fresh;
     return{...current,entry:beginPublish(current.entry,message.generation,token,deps.now())};
    });if(started.entry.lease?.token!==token||!started.entry.process.publishStartedAt)return;
     const latestAccess=await validate(started),final=await repo.publication(entry.id);
     if(!final||!isAutomaticInstagram(final.entry)||isReferenceSource(final.entry.source)||final.entry.kind==='text'||final.entry.lease?.token!==token||final.entry.generation!==message.generation||!final.entry.approval||final.entry.approval.contentHash!==publishingHash(publicationContentKey(final.entry,final.entry.media)))throw new PlannerError('Die endgültige Instagram-Freigabe wurde inzwischen geändert.');
     const mediaId=await deps.driver.publish(latestAccess.credentials,entry.process.containerId);await confirm(started.entry,mediaId);
   }
  }catch(error){
   if(error instanceof WakeEnqueueError)throw error;
   const current=await repo.publication(message.publicationId);if(!current||current.entry.lease?.token!==token||current.entry.generation!==message.generation)return;
   const reason=error instanceof InstagramError||error instanceof PlannerError?error.message:'Dieser Verarbeitungsschritt konnte nicht sicher abgeschlossen werden. Bitte den Stand prüfen.';
   const ambiguous=Boolean(current.entry.process.publishStartedAt)||error instanceof InstagramError&&error.kind==='ambiguous';
   await repo.mutatePublication(current.entry.id,previous=>previous&&previous.entry.lease?.token===token&&previous.entry.generation===message.generation?{...previous,entry:(!isAutomaticInstagram(previous.entry)||isReferenceSource(previous.entry.source)||previous.entry.kind==='text'||error instanceof PlannerError&&!previous.entry.process.publishStartedAt)?pausePublication(previous.entry,reason,deps.now()):failPublication(previous.entry,message.generation,token,reason,ambiguous,deps.now()),wake:null}:previous??current);
  }
  async function checkpoint(entry:PublicationRecord,patch:Partial<PublicationRecord['process']>,nextAt:string){
   await repo.mutatePublication(entry.id,current=>{
    if(!current||current.entry.lease?.token!==token||current.entry.generation!==message.generation)return current??claimed;
    const next=checkpointPublication(current.entry,message.generation,token,patch,nextAt,deps.now());return{...current,entry:next,wake:wakeFor(next)};
   });await dispatch(entry.id);await ensureNextIntent(entry.id);
  }
  async function confirm(entry:PublicationRecord,mediaId:string|null){await repo.mutatePublication(entry.id,current=>current&&current.entry.lease?.token===token&&current.entry.generation===message.generation?{...current,entry:confirmPublication(current.entry,message.generation,token,mediaId,deps.now()),wake:null}:current??claimed);}
 }
 async function ensureNextIntent(id:string){const row=await repo.publication(id);if(row?.wake&&!row.wake.queuedAt&&active(row.entry)&&Date.parse(row.wake.at)<=Date.parse(deps.now())+QUEUE_HORIZON_SECONDS*1000&&(await deps.readiness()).queue)throw new WakeEnqueueError('Der nächste Warteschlangenschritt ist noch nicht bestätigt.');}
 async function recover(){
  const ready=await deps.readiness();if(!ready.enabled)return{checked:0,enqueued:0};
  if(ready.queue)await deps.nativeMaintenance?.();
  const rows=await repo.publications();let enqueued=0;
  for(const row of rows){if(!active(row.entry)||!row.wake)continue;if(Date.parse(row.wake.at)>Date.parse(deps.now())+QUEUE_HORIZON_SECONDS*1000)continue;const before=row.wake.queuedAt;await dispatch(row.entry.id);const next=await repo.publication(row.entry.id);if(next?.wake?.queuedAt&&next.wake.queuedAt!==before)enqueued++;}
  return{checked:rows.length,enqueued};
 }
 return{dispatch,tick,recover};
}
