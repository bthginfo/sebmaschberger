import {nativeWakeActive} from '../connectors/publication-state';
import {createHash} from 'node:crypto';
import {isAutomaticInstagram,isReferenceSource,isUploadedSource,type PublicationDraft,type PublicationRecord,type PublicationSource,type StudioPublicationSource,type ConnectionView,type PlannerReadiness,type PublishingMedia} from '@/lib/social/publishing/model';
import {referenceContentKey} from '@/lib/social/publishing/reference';
import {uploadMediaMatches} from '@/lib/social/publishing/state';
import type {SocialProject} from '@/lib/social/model';
import type {InstagramDriver,InstagramCredentials} from './instagram';

export class PlannerError extends Error{constructor(message:string,public status=409){super(message);}}
export const publishingHash=(value:unknown)=>createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex');
export type Receipt={id:string;hash:string};
export type WakeIntent={id:string;at:string;queuedAt:string|null;messageId:string|null;dispatchAttempt?:number;dispatchLease:{token:string;until:string}|null};
export type StoredPublication={entry:PublicationRecord;projectSnapshot:SocialProject|null;approvedEpoch:number|null;receipts:Receipt[];wake:WakeIntent|null};
export type StoredConnection={view:ConnectionView;tokenCiphertext:string;receipts:Receipt[]};
export type StoredPublishingMedia={data:PublishingMedia;publicationId:string;inputHash:string;storageMode:'local'|'blob';storagePath:string};
export type PublishingRepository={
 epoch:()=>Promise<number>;
 publication:(id:string)=>Promise<StoredPublication|null>;publications:()=>Promise<StoredPublication[]>;
 mutatePublication:(id:string,update:(previous:StoredPublication|null)=>StoredPublication)=>Promise<StoredPublication>;
 connection:(id:string)=>Promise<StoredConnection|null>;connections:()=>Promise<StoredConnection[]>;
 mutateConnection:(id:string,update:(previous:StoredConnection|null)=>StoredConnection)=>Promise<StoredConnection>;
 source:(id:string)=>Promise<{source:StudioPublicationSource;project:SocialProject}>;sources:()=>Promise<StudioPublicationSource[]>;
 referenceBrandLabel?:()=>Promise<string>;
};
export type PublishingDependencies={repo:PublishingRepository;now:()=>string;readiness:()=>Promise<PlannerReadiness>;driver:InstagramDriver;encrypt:(value:string)=>string;decrypt:(value:string)=>string;verifyMedia:(record:StoredPublication)=>Promise<void>;native?:{accounts:()=>Promise<ConnectionView[]>;account:(id:string)=>Promise<ConnectionView|null>;approved:(entry:PublicationRecord,actor:string)=>Promise<PublicationRecord>;reconcile:(entry:PublicationRecord)=>Promise<PublicationRecord>}};
export function publicConnection(record:StoredConnection,now:string):ConnectionView{return{...record.view,status:record.view.status!=='disconnected'&&record.view.expiresAt&&Date.parse(record.view.expiresAt)<=Date.parse(now)?'expired':record.view.status};}
export function connectionCredentials(record:StoredConnection,decrypt:(value:string)=>string,now:string):InstagramCredentials{
 if(publicConnection(record,now).status!=='connected'||!record.tokenCiphertext)throw new PlannerError('Das Instagram-Konto ist nicht verbunden oder der Zugang ist abgelaufen.',409);
 return{accountId:record.view.accountId,accessToken:decrypt(record.tokenCiphertext)};
}
export function receiptSeen(receipts:Receipt[],id:string,hash:string){const receipt=receipts.find(value=>value.id===id);if(receipt&&receipt.hash!==hash)throw new PlannerError('Diese Vorgangskennung gehört zu einer anderen Änderung. Bitte erneut versuchen.');return Boolean(receipt);}
export function withReceipt(receipts:Receipt[],id:string,hash:string){return[...receipts.slice(-159),{id,hash}];}
export function wakeFor(entry:PublicationRecord):WakeIntent|null{return nativeWakeActive(entry)||isAutomaticInstagram(entry)&&!isReferenceSource(entry.source)&&entry.kind!=='text'&&entry.approval&&entry.nextActionAt&&['scheduling','scheduled','processing'].includes(entry.status)?{id:publishingHash([entry.id,entry.generation,entry.process.phase,entry.process.containerId,entry.nextActionAt]),at:entry.nextActionAt!,queuedAt:null,messageId:null,dispatchLease:null}:null;}
export function assertRevision(previous:StoredPublication|null,revision:number){if(!previous||previous.entry.revision!==revision)throw new PlannerError('Die Planung wurde inzwischen geändert. Ihr lokaler Entwurf bleibt erhalten. Bitte den aktuellen Stand laden.');return previous;}
export function assertConnectionRevision(previous:StoredConnection|null,revision:number){if(!previous||previous.view.revision!==revision)throw new PlannerError('Die Verbindung wurde inzwischen geändert. Bitte den aktuellen Stand neu laden.');return previous;}
export function sourceMatches(a:PublicationDraft['source'],b:PublicationSource){return JSON.stringify(a)===JSON.stringify(b);}
export function assertPublishingSource(row:StoredPublication){
 if(isReferenceSource(row.entry.source)){
  if(row.projectSnapshot!==null||row.entry.media!==null||row.entry.source.snapshotHash!==publishingHash(referenceContentKey(row.entry.source)))throw new PlannerError('Die gespeicherte Notiz oder Originaladresse stimmt nicht mehr mit dieser Planung überein.');
 }else if(isUploadedSource(row.entry.source)){
  if(row.projectSnapshot!==null||!uploadMediaMatches(row.entry.source,row.entry.media))throw new PlannerError('Die hochgeladene Datei stimmt nicht mehr mit dieser Planung überein. Bitte die Datei erneut hochladen.');
 }else if(!row.projectSnapshot||row.entry.source.snapshotHash!==publishingHash(row.projectSnapshot))throw new PlannerError('Der gespeicherte Social-Entwurf stimmt nicht mehr überein. Bitte die Quelle erneut auswählen.');
}
