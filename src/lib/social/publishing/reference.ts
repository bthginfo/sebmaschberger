import {z} from 'zod';
import {referencePublicationSourceSchema,type ReferencePublicationSource} from './model';

export type ReferenceSourceInput={title:string;brandKey:string;brandLabel:string;kind:'note'|'post'|'reel';url?:string|null};
const inputSchema=z.object({title:z.string().trim().min(1).max(140),brandKey:z.string().min(1).max(80),brandLabel:z.string().trim().min(1).max(100),kind:z.enum(['note','post','reel']),url:z.string().max(2048).nullable().optional()});
/** A reference is an inert link. No fetch, import, preview or provider handoff follows it. */
export function canonicalReferenceUrl(value:string){
 if(/[\u0000-\u001f\u007f]/.test(value))throw new Error('Bitte eine öffentliche HTTPS-Adresse ohne Steuerzeichen verwenden.');
 let url:URL;try{url=new URL(value.trim());}catch{throw new Error('Bitte eine vollständige HTTPS-Adresse zum Original angeben.');}
 const hostname=url.hostname.toLowerCase().replace(/\.$/,'');
 if(url.protocol!=='https:'||url.username||url.password||!hostname.includes('.')||hostname==='localhost'||hostname.endsWith('.localhost')||hostname.endsWith('.local')||hostname.endsWith('.internal')||hostname.includes(':')||/^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname))throw new Error('Bitte eine öffentliche HTTPS-Adresse ohne Zugangsdaten verwenden.');
 url.hostname=hostname;
 const result=url.toString();if(result.length>2048)throw new Error('Die Originaladresse darf höchstens 2.048 Zeichen enthalten.');
 return result;
}
export function referencePayload(input:ReferenceSourceInput){
 const value=inputSchema.parse(input),url=value.kind==='note'?null:canonicalReferenceUrl(value.url??'');
 if(value.kind==='note'&&value.url?.trim())throw new Error('Eine Textnotiz wird ohne Medienadresse gespeichert.');
 return{origin:'reference' as const,formatId:'reference' as const,title:value.title,brandKey:value.brandKey,brandLabel:value.brandLabel,kind:value.kind,slides:1 as const,url};
}
export const referenceContentKey=(input:ReferenceSourceInput)=>JSON.stringify(referencePayload(input));
export async function buildReferenceSource(input:ReferenceSourceInput):Promise<ReferencePublicationSource>{
 const payload=referencePayload(input),digest=await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(payload))),snapshotHash=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
 return referencePublicationSourceSchema.parse({...payload,snapshotHash});
}

