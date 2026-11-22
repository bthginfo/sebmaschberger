import 'server-only';
import {createHash} from 'node:crypto';
import {mkdir,readFile,realpath,writeFile} from 'node:fs/promises';
import {dirname,resolve,sep} from 'node:path';
import sharp from 'sharp';
import {get,put} from '@vercel/blob';
import {z} from 'zod';
import {AppError,getRecord,mutateRecord} from '@/lib/db';
import type {MediaAsset} from '@/lib/types';
import {idSchema,type SocialAsset} from '@/lib/social/model';
import {requireSocialEnabled,socialAssetView} from './store';

export const MAX_SOCIAL_IMAGE_BYTES=3*1024*1024;
type AssetRecord=SocialAsset&{storageMode:'local'|'blob';storagePath:string;contentHash:string;preparedHash:string};
const digest=(bytes:Buffer|string)=>createHash('sha256').update(bytes).digest('hex');
function localPath(id:string){z.uuid().parse(id);return resolve(process.cwd(),'.data','social-assets',id+'.webp');}
export async function prepareSocialImage(bytes:Buffer,mimeType:string){
 if(!bytes.length||bytes.length>MAX_SOCIAL_IMAGE_BYTES)throw new AppError('Bitte verwenden Sie ein Bild bis 3 MB.',413);
 const expected=({'image/jpeg':'jpeg','image/png':'png','image/webp':'webp'} as Record<string,string>)[mimeType];
 if(!expected)throw new AppError('Bitte verwenden Sie JPEG, PNG oder WebP.');
 try{const image=sharp(bytes,{limitInputPixels:40_000_000,animated:false}),metadata=await image.metadata();if(metadata.format!==expected||(metadata.pages??1)>1)throw new Error('format');const result=await image.rotate().resize(4096,4096,{fit:'inside',withoutEnlargement:true}).webp({quality:94}).toBuffer({resolveWithObject:true});return{bytes:result.data,width:result.info.width,height:result.info.height};}
 catch{throw new AppError('Dieses Bild konnte nicht sicher gelesen werden. Bitte laden Sie eine gültige Bilddatei hoch.');}
}
async function privateBlobBytes(path:string,token:string):Promise<Buffer>{
 const response=await get(path,{access:'private',token,useCache:false});if(!response||response.statusCode!==200)throw new AppError('Dieses Bild ist momentan nicht verfügbar.',404);
 return Buffer.from(await new Response(response.stream).arrayBuffer());
}
export async function uploadSocialAsset(input:{bytes:Buffer;mimeType:string;name:string;idempotencyKey:string}):Promise<SocialAsset>{
 await requireSocialEnabled();const id=z.uuid().parse(input.idempotencyKey),name=(input.name.trim()||'Eigenes Bild').slice(0,200);
 const contentHash=digest(Buffer.concat([Buffer.from(input.mimeType+'\0'+name+'\0'),input.bytes]));
 const existing=await getRecord<AssetRecord>('social-assets',id);if(existing){if(existing.contentHash!==contentHash)throw new AppError('Diese Upload-Kennung wurde bereits für ein anderes Bild verwendet.',409);return socialAssetView(existing);}
 const image=await prepareSocialImage(input.bytes,input.mimeType),preparedHash=digest(image.bytes),storageMode=process.env.VERCEL?'blob':'local';
 const token=process.env.PRIVATE_SOCIAL_BLOB_READ_WRITE_TOKEN;if(storageMode==='blob'&&!token)throw new AppError('Für eigene Social-Bilder muss der private Bildspeicher dieser Website eingerichtet werden. Website-Medien können Sie bereits auswählen.',503);
 const storagePath=storageMode==='local'?localPath(id):'social-studio/'+id+'.webp';
 if(storageMode==='local'){
  await mkdir(dirname(storagePath),{recursive:true});
  try{await writeFile(storagePath,image.bytes,{flag:'wx',mode:0o600});}catch(error){if((error as NodeJS.ErrnoException).code!=='EEXIST'||digest(await readFile(storagePath))!==preparedHash)throw new AppError('Der Bild-Upload konnte nicht abgeschlossen werden. Bitte erneut versuchen.',409);}
 }else{
  try{await put(storagePath,image.bytes,{access:'private',token,contentType:'image/webp',addRandomSuffix:false,allowOverwrite:false});}
  catch(error){let found:Buffer;try{found=await privateBlobBytes(storagePath,token!);}catch{throw error;}if(digest(found)!==preparedHash)throw new AppError('Diese Upload-Kennung gehört zu einem anderen Bild.',409);}
 }
 const record:AssetRecord={id,name,src:'/api/admin/social/assets/'+id,width:image.width,height:image.height,mimeType:'image/webp',createdAt:new Date().toISOString(),storageMode,storagePath,contentHash,preparedHash};
 // Keep provider I/O outside mutateRecord: its pure updater can run more than once.
 const saved=await mutateRecord<AssetRecord|null>('social-assets',id,null,current=>{if(current&&current.contentHash!==contentHash)throw new AppError('Diese Upload-Kennung gehört zu einem anderen Bild.',409);return current??record;});
 return socialAssetView(saved!);
}
export async function readSocialAsset(id:string){
 await requireSocialEnabled();z.uuid().parse(id);const record=await getRecord<AssetRecord>('social-assets',id);if(!record)throw new AppError('Dieses Bild wurde nicht gefunden.',404);
 if(record.storageMode==='local'){
  if(process.env.VERCEL||record.storagePath!==localPath(id))throw new AppError('Dieses lokale Bild ist in dieser Umgebung nicht verfügbar.',404);
  try{return{bytes:new Uint8Array(await readFile(localPath(id))),mimeType:'image/webp'};}catch{throw new AppError('Dieses Bild ist momentan nicht verfügbar.',404);}
 }
 if(record.storagePath!=='social-studio/'+id+'.webp')throw new AppError('Der Bildpfad ist nicht verfügbar.',404);
 const token=process.env.PRIVATE_SOCIAL_BLOB_READ_WRITE_TOKEN;if(!token)throw new AppError('Der private Social-Bildspeicher ist nicht eingerichtet.',503);
 return{bytes:new Uint8Array(await privateBlobBytes(record.storagePath,token)),mimeType:'image/webp'};
}
async function boundedBytes(response:Response,max:number){
 if(Number(response.headers.get('content-length')||0)>max)throw new AppError('Das Bild ist zu groß.',413);
 const reader=response.body?.getReader();if(!reader)throw new AppError('Das Bild ist nicht verfügbar.',404);const parts:Uint8Array[]=[];let size=0;
 try{while(true){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>max){await reader.cancel();throw new AppError('Das Bild ist zu groß.',413);}parts.push(next.value);}}finally{reader.releaseLock();}
 return new Uint8Array(Buffer.concat(parts));
}
export async function readWebsiteMedia(id:string){
 await requireSocialEnabled();idSchema.parse(id);const media=await getRecord<MediaAsset>('media',id);if(!media||!/^image\/(?:png|jpeg|webp|svg\+xml)$/.test(media.type))throw new AppError('Dieses Website-Bild wurde nicht gefunden.',404);
 if(/^\/(?:placeholders|media|assets)\/[a-zA-Z0-9_./-]+\.(?:svg|png|jpe?g|webp)$/.test(media.url)&&!media.url.includes('..')){
  const base=await realpath(resolve(process.cwd(),'public')),file=await realpath(resolve(process.cwd(),'public',media.url.slice(1)));
  if(!file.startsWith(base+sep))throw new AppError('Dieses Bild ist nicht verfügbar.',404);
  const bytes=await readFile(file);if(bytes.length>4.4*1024*1024)throw new AppError('Das Bild ist zu groß.',413);return{bytes:new Uint8Array(bytes),mimeType:media.type};
 }
 let url:URL;try{url=new URL(media.url);}catch{throw new AppError('Dieses Website-Bild ist nicht verfügbar.',404);}
 if(url.protocol!=='https:'||url.username||url.password||url.port||!url.hostname.endsWith('.public.blob.vercel-storage.com')||media.type==='image/svg+xml')throw new AppError('Dieses Bild stammt nicht aus dem Bildspeicher dieser Website.',404);
 const response=await fetch(url,{redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000)});if(!response.ok)throw new AppError('Dieses Website-Bild ist momentan nicht verfügbar.',404);
 return{bytes:await boundedBytes(response,4.4*1024*1024),mimeType:media.type};
}
