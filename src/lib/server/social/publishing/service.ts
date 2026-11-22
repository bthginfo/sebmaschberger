import {validCarouselSource} from '@/lib/social/publishing/carousel';
import {isNativeDelivery,nativeWakeActive} from '../connectors/publication-state';
import {ConnectorError} from '../connectors/provider-contract';
import 'server-only';
import {z} from 'zod';
import {AppError} from '@/lib/db';
import {assertAutomaticPublication,PublishingStateError} from '@/lib/social/publishing/state';
import {isAutomaticInstagram,isReferenceSource,isUploadedSource,plannerActionSchema,plannerUploadSchema,uploadedPublicationSourceSchema} from '@/lib/social/publishing/model';
import {PlannerError,publishingHash,receiptSeen} from './types';
import {plannerOperations,publishingScheduler} from './runtime';
import {publishingRepository,requirePublishingEnabled} from './store';
import {readPublishingMedia} from './media-read';
import {storePreparedMedia,storeUploadedMedia} from './media-prepare';
import {readSocialBrand} from '@/lib/server/social/store';

export async function plannerCall<T>(work:()=>Promise<T>):Promise<T>{try{return await work();}catch(error){if(error instanceof ConnectorError)throw new AppError(error.message,error.kind==='permission'?403:409);if(error instanceof PlannerError||error instanceof PublishingStateError)throw new AppError(error.message,error.status);throw error;}}
export const loadPlannerWorkspace=()=>plannerCall(()=>plannerOperations.workspace());
export const loadPlannerEntry=(id:string)=>plannerCall(()=>plannerOperations.load(z.uuid().parse(id)));
export const savePlannerEntry=(input:unknown)=>plannerCall(()=>plannerOperations.save(input));
export const cancelPlannerEntry=(input:unknown)=>plannerCall(()=>plannerOperations.cancel(input));
export const completePlannerEntry=(input:unknown,actor:string)=>plannerCall(()=>plannerOperations.complete(input,actor));
export const reopenPlannerEntry=(input:unknown)=>plannerCall(()=>plannerOperations.reopen(input));
export const copyPlannerEntry=(input:unknown)=>plannerCall(()=>plannerOperations.copy(input));
export const savePlannerConnection=(input:unknown)=>plannerCall(()=>plannerOperations.saveConnection(input));
export const checkPlannerConnection=(input:unknown)=>plannerCall(()=>plannerOperations.checkConnection(input));
export const disconnectPlannerConnection=(input:unknown)=>plannerCall(()=>plannerOperations.disconnect(input));
export async function approvePlannerEntry(input:unknown,actor:string){return plannerCall(async()=>{const entry=await plannerOperations.approve(input,actor);return await publishingScheduler.dispatch(entry.id)??entry;});}
export async function reconcilePlannerEntry(input:unknown){return plannerCall(async()=>{
 const data=plannerActionSchema.parse(input),row=await publishingRepository.publication(data.id);
 if(row&&(nativeWakeActive(row.entry)||isAutomaticInstagram(row.entry)&&!isReferenceSource(row.entry.source)&&row.entry.kind!=='text')&&row.entry.revision===data.baseRevision&&row.entry.status==='scheduling'&&row.entry.approval){await requirePublishingEnabled();return await publishingScheduler.dispatch(data.id)??row.entry;}
 return plannerOperations.reconcile(input);
});}
export async function preparePlannerEntry(input:{id:string;idempotencyKey:string;baseRevision:number;bytes:Buffer;mimeType:string;slideIndex?:number}){return plannerCall(async()=>{
 await requirePublishingEnabled();const data=plannerActionSchema.parse({id:input.id,idempotencyKey:input.idempotencyKey,baseRevision:input.baseRevision}),row=await publishingRepository.publication(data.id);
 if(!row)throw new PlannerError('Diese Planung wurde nicht gefunden.',404);
 if(Boolean(row.entry.carousel)!==(input.slideIndex!==undefined)||input.slideIndex!==undefined&&(!validCarouselSource(row.entry)||!Number.isInteger(input.slideIndex)||input.slideIndex<0||input.slideIndex>=row.entry.source.slides))throw new PlannerError('Bitte die passende Folie des gespeicherten Carousels vorbereiten.');
 if(!isNativeDelivery(row.entry))assertAutomaticPublication(row.entry);if(row.entry.kind==='text'||isReferenceSource(row.entry.source))throw new PlannerError('Für diesen Inhalt werden keine eigenen Medien vorbereitet.');
  if(isUploadedSource(row.entry.source))throw new PlannerError('Zum Ersetzen dieser Datei bitte „Datei ersetzen“ verwenden.');
 const receipt=row.receipts.some(value=>value.id===data.idempotencyKey);if(!receipt&&(row.entry.revision!==data.baseRevision||row.entry.status==='published'||row.entry.lease||row.entry.process.publishStartedAt))throw new PlannerError('Bitte den aktuellen Entwurf speichern und neu laden, bevor Sie Medien vorbereiten.');
 const media=await storePreparedMedia(row,input);return plannerOperations.prepare({...data,media});
});}
export async function uploadPlannerEntry(input:{metadata:unknown;filename:string;bytes:Buffer;mimeType:string}){return plannerCall(async()=>{
 await requirePublishingEnabled();const data=plannerUploadSchema.parse(input.metadata);if(data.brandKey!=='default')throw new PlannerError('Bitte die Marke dieser Website verwenden.');
 const filename=input.filename.split(/[\\/]/).at(-1)!.normalize('NFC').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,160)||'Beitrag';
 const requestHash=publishingHash({action:'upload',...data,filename,mimeType:input.mimeType,bytes:publishingHash(input.bytes)}),row=await publishingRepository.publication(data.id);
 if(row&&receiptSeen(row.receipts,data.idempotencyKey,requestHash))return row.entry;
 if(row&&(row.entry.revision!==data.baseRevision||!isUploadedSource(row.entry.source)||row.entry.source.brandKey!==data.brandKey||row.entry.status==='published'||row.entry.lease||row.entry.process.publishStartedAt)||!row&&data.baseRevision!==0)throw new PlannerError('Bitte den aktuellen Upload-Entwurf speichern und neu laden. Nur eine unveröffentlichte eigene Upload-Datei kann ersetzt werden.');
 // Verify names and request identity before decoding or creating immutable files.
 uploadedPublicationSourceSchema.shape.filename.parse(filename);
 const[media,brand]=await Promise.all([storeUploadedMedia(data.id,{...input,idempotencyKey:data.idempotencyKey}),readSocialBrand()]);
 return plannerOperations.upload({request:data,filename,requestHash,media,brandLabel:brand.brand.name});
});}
export const loadPlannerPreview=(id:string)=>plannerCall(async()=>{await requirePublishingEnabled();return readPublishingMedia(z.uuid().parse(id));});
