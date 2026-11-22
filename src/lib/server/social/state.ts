import {createHash} from 'node:crypto';
import {archiveSchema,brandSaveSchema,saveSchema,type SocialBrandProfile,type SocialProject,type SocialSnapshot} from '@/lib/social/model';

export class SocialStateError extends Error {constructor(message:string,public status=409){super(message);}}
type Receipt={hash:string;revision:number};
export type SocialProjectRecord={project:SocialProject|null;revision:number;updatedAt:string|null;archived:boolean;receipts:Record<string,Receipt>};
export type SocialBrandRecord={brand:SocialBrandProfile|null;revision:number;updatedAt:string|null;receipts:Record<string,Receipt>};
export const emptyProject=():SocialProjectRecord=>({project:null,revision:0,updatedAt:null,archived:false,receipts:{}});
export const emptyBrand=():SocialBrandRecord=>({brand:null,revision:0,updatedAt:null,receipts:{}});
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function replay(record:{revision:number;receipts:Record<string,Receipt>},key:string,payloadHash:string):boolean {
 const receipt=record.receipts[key];if(!receipt)return false;
 if(receipt.hash!==payloadHash)throw new SocialStateError('Diese Vorgangskennung wurde bereits mit anderen Daten verwendet.');
 if(receipt.revision!==record.revision)throw new SocialStateError('Der Vorgang wurde bereits gespeichert. Inzwischen gibt es einen neueren Stand. Bitte laden Sie ihn bewusst neu.');
 return true;
}
function receipts(previous:Record<string,Receipt>,key:string,payloadHash:string,revision:number) {
 return{...Object.fromEntries(Object.entries(previous).slice(-39)),[key]:{hash:payloadHash,revision}};
}
export function saveProjectState(previous:SocialProjectRecord,input:unknown,at:string):SocialProjectRecord {
 const data=saveSchema.parse(input),payloadHash=hash({project:data.project,baseRevision:data.baseRevision});
 if(replay(previous,data.idempotencyKey,payloadHash))return previous;
 if(previous.revision!==data.baseRevision||previous.archived)throw new SocialStateError('Dieser Entwurf wurde in einer anderen Sitzung geändert. Ihre Eingaben bleiben erhalten. Laden Sie den gespeicherten Stand bewusst neu.');
 const revision=previous.revision+1;
 return{project:structuredClone(data.project),revision,updatedAt:at,archived:false,receipts:receipts(previous.receipts,data.idempotencyKey,payloadHash,revision)};
}
export function archiveProjectState(previous:SocialProjectRecord,input:unknown,at:string):SocialProjectRecord {
 const data=archiveSchema.parse(input),payloadHash=hash({id:data.id,baseRevision:data.baseRevision,archive:true});
 if(replay(previous,data.idempotencyKey,payloadHash))return previous;
 if(!previous.project||previous.project.id!==data.id||previous.archived||previous.revision!==data.baseRevision)throw new SocialStateError('Der Entwurf wurde inzwischen geändert oder archiviert. Bitte laden Sie die Bibliothek neu.');
 const revision=previous.revision+1;
 return{...previous,archived:true,revision,updatedAt:at,receipts:receipts(previous.receipts,data.idempotencyKey,payloadHash,revision)};
}
export function saveBrandState(previous:SocialBrandRecord,input:unknown,at:string):SocialBrandRecord {
 const data=brandSaveSchema.parse(input),payloadHash=hash({brand:data.brand,baseRevision:data.baseRevision});
 if(replay(previous,data.idempotencyKey,payloadHash))return previous;
 if(previous.revision!==data.baseRevision)throw new SocialStateError('Das Markenprofil wurde inzwischen geändert. Ihre Eingaben bleiben erhalten. Bitte laden Sie den gespeicherten Stand neu.');
 const revision=previous.revision+1;
 return{brand:structuredClone(data.brand),revision,updatedAt:at,receipts:receipts(previous.receipts,data.idempotencyKey,payloadHash,revision)};
}
export function projectSnapshot(record:SocialProjectRecord):SocialSnapshot {
 if(!record.project||record.archived)throw new SocialStateError('Dieser Entwurf wurde nicht gefunden.',404);
 return{project:structuredClone(record.project),revision:record.revision,updatedAt:record.updatedAt};
}
