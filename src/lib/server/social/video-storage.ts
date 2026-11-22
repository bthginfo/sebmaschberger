import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {Readable} from 'node:stream';
import {del,get} from '@vercel/blob';
import {generateClientTokenFromReadWriteToken} from '@vercel/blob/client';
import {z} from 'zod';
import {inspectVideo} from '../../social/video-input';
import {MAX_VIDEO_BYTES,VIDEO_PREFIX,readVideoRange,videoAssetView,videoUploadSchema,type VideoAsset,type VideoUpload} from '../../social/video-model';

export type StoredVideo=VideoAsset&{storageMode:'blob'|'local';contentHash:string};
type Deps={
 actor:string;
 hosted:boolean;
 directory:string;
 prefix:string;
 token?:string;
 find(id:string):Promise<StoredVideo|null>;
 save(record:StoredVideo):Promise<StoredVideo>;
 error(message:string,status?:number):Error;
};
const completeSchema=videoUploadSchema.extend({ticket:z.string().regex(/^[a-f0-9]{64}$/),expiresAt:z.number().int().positive()});
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');

async function readLimited(body:ReadableStream<Uint8Array>|null,expected:number){
 if(!body)throw new Error('Missing video data');
 const reader=body.getReader(),parts:Uint8Array[]=[];
 let received=0;
 try{
  for(;;){
   const next=await reader.read();if(next.done)break;
   received+=next.value.byteLength;
   if(received>expected||received>MAX_VIDEO_BYTES){await reader.cancel();throw new Error('Video size differs from upload');}
   parts.push(next.value);
  }
 }finally{reader.releaseLock();}
 if(received!==expected)throw new Error('Incomplete video upload');
 return Buffer.concat(parts);
}

export function createVideoStorage(deps:Deps){
 const token=()=>{
  if(!deps.token)throw deps.error('Der private Studio-Medienspeicher ist noch nicht verbunden.',503);
  return deps.token;
 };
 const basename=(id:string,mimeType:VideoUpload['mimeType'])=>z.uuid().parse(id)+(mimeType==='video/mp4'?'.mp4':'.webm');
 const pathname=(upload:Pick<VideoUpload,'id'|'mimeType'>)=>deps.prefix+'/'+basename(upload.id,upload.mimeType);
 const filepath=(upload:Pick<VideoUpload,'id'|'mimeType'>)=>resolve(deps.directory,basename(upload.id,upload.mimeType));
 const stamp=(upload:VideoUpload,expiresAt:number)=>createHmac('sha256',token())
  .update(JSON.stringify(['studio-video-v1',deps.actor,pathname(upload),upload.name,upload.mimeType,upload.size,expiresAt])).digest('hex');
 async function inspect(upload:VideoUpload,bytes:Buffer,mode:StoredVideo['storageMode']){
  try{
   const shape=await inspectVideo(new Blob([new Uint8Array(bytes)],{type:upload.mimeType}),upload.mimeType);
   return {...upload,...shape,src:VIDEO_PREFIX+upload.id,storageMode:mode,contentHash:sha(bytes),createdAt:new Date().toISOString()} satisfies StoredVideo;
  }catch(error){throw deps.error(error instanceof Error?error.message:'Das Video konnte nicht gelesen werden.',422);}
 }
 async function init(input:unknown){
  const upload=videoUploadSchema.parse(input);
  if(!deps.hosted)return {mode:'local' as const};
  if(await deps.find(upload.id))throw deps.error('Diese Videodatei wurde schon gespeichert.',409);
  const expiresAt=Date.now()+15*60_000;
  const uploadToken=await generateClientTokenFromReadWriteToken({token:token(),pathname:pathname(upload),maximumSizeInBytes:upload.size,
   allowedContentTypes:[upload.mimeType],validUntil:expiresAt,addRandomSuffix:false,allowOverwrite:false});
  return {mode:'blob' as const,uploadToken,pathname:pathname(upload),ticket:stamp(upload,expiresAt),expiresAt};
 }
 async function complete(input:unknown){
  if(!deps.hosted)throw deps.error('Dieser Upload ist hier nicht verfügbar.',404);
  const {ticket,expiresAt,...upload}=completeSchema.parse(input);
  if(expiresAt<Date.now()||!timingSafeEqual(Buffer.from(ticket,'hex'),Buffer.from(stamp(upload,expiresAt),'hex')))throw deps.error('Bitte starten Sie den Video-Upload erneut.',403);
  const previous=await deps.find(upload.id);
  if(previous){
   if(previous.name!==upload.name||previous.mimeType!==upload.mimeType||previous.size!==upload.size)throw deps.error('Diese Datei gehört zu einem anderen Upload.',409);
   return videoAssetView(previous);
  }
  const path=pathname(upload),stored=await get(path,{token:token(),access:'private',useCache:false});
  if(!stored||stored.statusCode!==200)throw deps.error('Das Video ist noch nicht vollständig im Speicher angekommen.',409);
  let record:StoredVideo;
  try{
   if(stored.blob.size!==upload.size||stored.blob.contentType!==upload.mimeType){await stored.stream.cancel();throw deps.error('Dateigröße oder Videoformat stimmen nicht mit dem Upload überein.',422);}
   const bytes=await readLimited(stored.stream,upload.size).catch(()=>{throw deps.error('Der Upload ist unvollständig. Laden Sie die Datei erneut hoch.',422);});
   record=await inspect(upload,bytes,'blob');
  }catch(error){
   if(!await deps.find(upload.id))await del(path,{token:token()}).catch(()=>{});
   throw error;
  }
  return videoAssetView(await deps.save(record));
 }
 async function local(request:Request){
  if(deps.hosted)throw deps.error('Dieser Upload ist hier nicht verfügbar.',404);
  const params=new URL(request.url).searchParams;
  const upload=videoUploadSchema.parse({id:params.get('id'),name:params.get('name'),mimeType:request.headers.get('content-type'),size:Number(params.get('size'))});
  const bytes=await readLimited(request.body,upload.size).catch(()=>{throw deps.error('Die Videodatei ist unvollständig oder zu groß.',422);});
  const previous=await deps.find(upload.id);
  if(previous){
   if(previous.contentHash!==sha(bytes))throw deps.error('Diese Datei gehört zu einem anderen Upload.',409);
   return videoAssetView(previous);
  }
  const record=await inspect(upload,bytes,'local'),file=filepath(upload);
  await mkdir(deps.directory,{recursive:true});
  try{await writeFile(file,bytes,{flag:'wx',mode:0o600});}catch(error){
   if((error as NodeJS.ErrnoException).code!=='EEXIST'||sha(await readFile(file))!==record.contentHash)throw deps.error('Die Videodatei konnte nicht gespeichert werden.',409);
  }
  return videoAssetView(await deps.save(record));
 }
 async function read(id:string,request:Request){
  const asset=await deps.find(z.uuid().parse(id));
  if(!asset||deps.hosted!==(asset.storageMode==='blob'))throw deps.error('Dieses Studio-Video ist nicht verfügbar.',404);
  const range=readVideoRange(request.headers.get('range'),asset.size);
  const headers:Record<string,string>={'Content-Type':asset.mimeType,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes','Content-Disposition':'inline'};
  if(range==='invalid')return new Response(null,{status:416,headers:{...headers,'Content-Range':'bytes */'+asset.size}});
  const count=range?range.end-range.start+1:asset.size;
  if(range)headers['Content-Range']='bytes '+range.start+'-'+range.end+'/'+asset.size;
  headers['Content-Length']=String(count);
  if(request.method==='HEAD')return new Response(null,{status:range?206:200,headers});
  let stream:ReadableStream;
  if(asset.storageMode==='local'){
   const file=filepath(asset);
   stream=Readable.toWeb(createReadStream(file,range??{})) as ReadableStream<Uint8Array>;
  }else{
   const file=await get(pathname(asset),{token:token(),access:'private',headers:range?{Range:'bytes='+range.start+'-'+range.end}:undefined});
   if(!file||file.statusCode!==200)throw deps.error('Die gespeicherte Videodatei ist gerade nicht verfügbar.',404);
   const providerRange=file.headers.get('content-range');
   if(range&&providerRange!==headers['Content-Range']){
    if(providerRange||file.blob.size!==asset.size){await file.stream.cancel();throw deps.error('Der Videospeicher hat einen ungültigen Ausschnitt geliefert.',502);}
    stream=sliceStream(file.stream,range.start,range.end+1);
   }else stream=file.stream;
  }
  return new Response(stream,{status:range?206:200,headers});
 }
 return {init,complete,local,read};
}
function sliceStream(source:ReadableStream<Uint8Array>,start:number,end:number){
 const reader=source.getReader();
 let offset=0;
 return new ReadableStream<Uint8Array>({
  async pull(controller){
   for(;;){
    const next=await reader.read();
    if(next.done){controller.close();return;}
    const after=offset+next.value.length;
    if(after>start)controller.enqueue(next.value.subarray(Math.max(0,start-offset),Math.min(next.value.length,end-offset)));
    offset=after;
    if(after>=end){controller.close();await reader.cancel();return;}
    if(after>start)return;
   }
  },
  async cancel(){await reader.cancel();},
 });
}
