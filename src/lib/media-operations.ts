import sharp from 'sharp';
import {randomUUID} from 'node:crypto';
import type {MediaAsset} from './types';

export class MediaOperationError extends Error {constructor(message:string,public status=400){super(message);}}
export interface MediaOperations {
 configured():boolean;
 put(path:string,bytes:Buffer):Promise<{url:string}>;
 removeBlob(url:string):Promise<void>;
 save(asset:MediaAsset):Promise<void>;
 find(id:string):Promise<MediaAsset|null>;
 referenced(asset:MediaAsset):Promise<boolean>;
 removeRecord(id:string):Promise<void>;
}
export function createMediaOperations(io:MediaOperations){
 return{
  async upload(file:File,alt=''):Promise<MediaAsset>{
   if(!io.configured())throw new MediaOperationError('Der Bildspeicher ist noch nicht verbunden.',503);
   if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new MediaOperationError('Bitte wählen Sie ein JPG-, PNG- oder WebP-Bild.');
   if(!file.size||file.size>4*1024*1024)throw new MediaOperationError('Bitte verwenden Sie ein Bild mit höchstens 4 MB.',413);
   let bytes:Buffer,width:number,height:number;
   try{
    const image=sharp(Buffer.from(await file.arrayBuffer()),{limitInputPixels:40_000_000,animated:false});
    const metadata=await image.metadata();
    const expected=({'image/jpeg':'jpeg','image/png':'png','image/webp':'webp'} as Record<string,string>)[file.type];
    if(metadata.format!==expected||(metadata.pages??1)>1)throw new Error('format');
    const result=await image.rotate().resize(2560,2560,{fit:'inside',withoutEnlargement:true}).webp({quality:88}).toBuffer({resolveWithObject:true});
    bytes=result.data;width=result.info.width;height=result.info.height;
   }catch{throw new MediaOperationError('Dieses Bild konnte nicht gelesen werden. Bitte versuchen Sie eine andere Datei.');}
   const name=file.name.replace(/\.[^.]+$/,'').normalize('NFKD').replace(/[^a-zA-Z\d-]/g,'-').slice(0,80)||'unternehmen-bild';
   const blob=await io.put(`media/${name}.webp`,bytes);
   const asset:MediaAsset&{width:number;height:number}={id:randomUUID(),url:blob.url,name:file.name.slice(0,200),alt:alt.slice(0,500),type:'image/webp',size:bytes.length,position:'50% 50%',width,height,createdAt:new Date().toISOString()};
   try{await io.save(asset);}catch(error){
    // A transport error can follow a successful write. Never delete an asset
    // whose metadata actually committed.
    let committed:MediaAsset|null;
    try{committed=await io.find(asset.id);}catch{throw error;}
    if(committed?.url===asset.url)return committed;
    await io.removeBlob(blob.url).catch(()=>console.error('Uncommitted media cleanup failed'));
    throw error;
   }
   return asset;
  },
  async remove(id:string):Promise<void>{
   const asset=await io.find(id);if(!asset)throw new MediaOperationError('Das Bild wurde nicht gefunden.',404);
   if(await io.referenced(asset))throw new MediaOperationError('Dieses Bild wird noch in einer Seite, einer gespeicherten Version oder einem Social-Entwurf verwendet. Entfernen oder ersetzen Sie es dort zuerst.',409);
   if(/^\/api\/editor-media\/[a-f0-9-]{36}\.webp$/.test(asset.url)||asset.url.startsWith('https://')&&new URL(asset.url).hostname.endsWith('.public.blob.vercel-storage.com'))await io.removeBlob(asset.url);
   await io.removeRecord(id);
  }
 };
}
