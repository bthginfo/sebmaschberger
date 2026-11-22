import {isNativeDelivery,nativeApprovalValid} from '../connectors/publication-state';
import 'server-only';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {get} from '@vercel/blob';
import {z} from 'zod';
import {isAutomaticInstagram,isReferenceSource,type PublicationRecord} from '@/lib/social/publishing/model';
import {publicPublishingOrigin,publishingEnabled,publishingRepository,readStoredPublishingMedia} from './store';
import {assertPublishingSource,PlannerError,publicConnection,publishingHash,type StoredPublication} from './types';
import {mediaSignature,validateMediaSignature} from './signed-media';

export async function readPublishingMedia(id:string){
 z.uuid().parse(id);const record=await readStoredPublishingMedia(id);if(!record)throw new PlannerError('Diese vorbereiteten Medien wurden nicht gefunden.',404);
 const extension=record.data.mimeType==='image/jpeg'?'.jpg':'.mp4',expected=record.storageMode==='local'?resolve(process.cwd(),'.data','publishing-media',id+extension):'social-publishing/'+id+extension;
 if(record.storagePath!==expected)throw new PlannerError('Der Medienpfad ist nicht verfügbar.',404);let bytes:Buffer;
 if(record.storageMode==='local'){if(process.env.VERCEL)throw new PlannerError('Diese lokalen Medien sind hier nicht verfügbar.',404);bytes=await readFile(expected);}
 else{const token=process.env.PRIVATE_SOCIAL_BLOB_READ_WRITE_TOKEN;if(!token)throw new PlannerError('Der private Medienspeicher fehlt.',503);const response=await get(expected,{access:'private',token,useCache:false});if(!response||response.statusCode!==200)throw new PlannerError('Diese Medien sind gerade nicht verfügbar.',404);const reader=response.stream.getReader(),parts:Uint8Array[]=[];let size=0;try{for(;;){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>4*1024*1024){await reader.cancel();throw new PlannerError('Die Medien überschreiten die erlaubte Größe.',413);}parts.push(next.value);}}finally{reader.releaseLock();}bytes=Buffer.concat(parts);}
 if(bytes.length!==record.data.bytes||bytes.length>4*1024*1024||publishingHash(bytes)!==record.data.sha256)throw new PlannerError('Die vorbereiteten Medien stimmen nicht mehr überein. Bitte neu vorbereiten.');return{...record,bytes};
}
export async function verifyStoredMedia(row:StoredPublication){assertPublishingSource(row);if(!row.entry.media)throw new PlannerError('Bitte zuerst die Medien vorbereiten.');const media=await readPublishingMedia(row.entry.media.id);if(media.publicationId!==row.entry.id||media.data.sha256!==row.entry.media.sha256||media.data.sourceHash!==row.entry.source.snapshotHash)throw new PlannerError('Die Medien gehören zu einem anderen Entwurfsstand.');}
export async function providerMediaUrl(entry:PublicationRecord,at:string,mediaId=entry.media?.id){
 const origin=await publicPublishingOrigin(),secret=process.env.AUTH_SECRET||'';if((!isAutomaticInstagram(entry)&&!isNativeDelivery(entry))||isNativeDelivery(entry)&&!nativeApprovalValid(entry)||isReferenceSource(entry.source)||entry.kind==='text'||!origin||!entry.media||!entry.approval)throw new PlannerError('Die öffentliche geschützte Medienfreigabe ist noch nicht eingerichtet.',503);
 const selected=entry.carousel?entry.mediaItems?.find(item=>item.id===mediaId):entry.media;if(!selected||selected.id!==mediaId)throw new PlannerError('Diese Datei gehört nicht zum freigegebenen Beitrag.',403);
 const expires=Math.floor(Date.parse(at)/1000)+3600,value=[entry.id,selected.id,entry.generation,expires].join(':'),url=new URL('/api/social/publishing-media/'+selected.id,origin);
 url.searchParams.set('publication',entry.id);url.searchParams.set('generation',String(entry.generation));url.searchParams.set('expires',String(expires));url.searchParams.set('signature',mediaSignature(value,secret));return url.toString();
}
export async function authorizeProviderMedia(url:URL,now=Date.now()){
 const id=z.uuid().parse(url.pathname.split('/').at(-1)),publication=z.uuid().parse(url.searchParams.get('publication')),generation=Number(url.searchParams.get('generation')),expires=Number(url.searchParams.get('expires')),signature=url.searchParams.get('signature')||'';
 validateMediaSignature({id,publication,generation,expires,signature},process.env.AUTH_SECRET||'',now);
 if(!await publishingEnabled())throw new PlannerError('Diese Medienfreigabe ist nicht aktiv.',403);
 const row=await publishingRepository.publication(publication),entry=row?.entry;
 if(!entry||(!isAutomaticInstagram(entry)&&!isNativeDelivery(entry))||isReferenceSource(entry.source)||entry.kind==='text'||entry.generation!==generation||!entry.approval||!(entry.carousel?entry.mediaItems?.some(item=>item.id===id):entry.media?.id===id)||(!isNativeDelivery(entry)&&entry.approval.mediaHash!==entry.media?.sha256)||!['scheduling','scheduled','processing'].includes(entry.status))throw new PlannerError('Diese Medienfreigabe ist nicht mehr aktiv.',403);
 if(row.approvedEpoch!==await publishingRepository.epoch())throw new PlannerError('Diese Medienfreigabe wurde durch das Ausschalten des Post-Planers aufgehoben.',403);
 assertPublishingSource(row);
 if(isNativeDelivery(entry)){if(!nativeApprovalValid(entry))throw new PlannerError('Diese Inhaltsfreigabe ist nicht mehr aktiv.',403);const{nativePipeline}=await import('../connectors/runtime');await nativePipeline.validate(entry);}
 else{const connection=entry.accountId?await publishingRepository.connection(entry.accountId):null;if(!connection||publicConnection(connection,new Date(now).toISOString()).status!=='connected'||connection.view.generation!==entry.approval.connectionGeneration)throw new PlannerError('Die Instagram-Verbindung ist nicht mehr freigegeben.',403);}
 const selected=entry.carousel?entry.mediaItems?.find(item=>item.id===id):entry.media;if(!selected)throw new PlannerError('Diese Datei gehört nicht zum freigegebenen Beitrag.',403);const media=await readPublishingMedia(id);if(media.publicationId!==publication||media.data.sha256!==selected.sha256||media.data.sourceHash!==entry.source.snapshotHash||media.data.slideIndex!==selected.slideIndex)throw new PlannerError('Diese Medien gehören zu einem anderen Auftrag.',403);return media;
}
