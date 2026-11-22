import 'server-only';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import sharp from 'sharp';
import {get,put} from '@vercel/blob';
import {z} from 'zod';
import {mutateRecord} from '@/lib/db';
import {MAX_PUBLISHING_MEDIA_BYTES,type PublishingMedia} from '@/lib/social/publishing/model';
import {PUBLISHING_MEDIA,readStoredPublishingMedia} from './store';
import {PlannerError,publishingHash,type StoredPublication,type StoredPublishingMedia} from './types';

export function publishingMediaPath(id:string,mimeType:'image/jpeg'|'video/mp4',mode:'local'|'blob'){z.uuid().parse(id);const name=id+(mimeType==='image/jpeg'?'.jpg':'.mp4');return mode==='local'?resolve(process.cwd(),'.data','publishing-media',name):'social-publishing/'+name;}
function assertMp4Structure(bytes:Buffer){let moov=-1,mdat=-1;function boxes(start:number,end:number,depth=0){if(depth>8)throw new Error();let at=start;while(at+8<=end){let size=bytes.readUInt32BE(at),header=8;if(size===1){if(at+16>end)throw new Error();const large=bytes.readBigUInt64BE(at+8);if(large>BigInt(bytes.length))throw new Error();size=Number(large);header=16;}if(size===0)size=end-at;if(size<header||at+size>end)throw new Error();const type=bytes.toString('ascii',at+4,at+8);if(depth===0&&type==='moov')moov=at;if(depth===0&&type==='mdat')mdat=at;if(type==='edts')throw new Error();if(['moov','trak','mdia','minf','stbl'].includes(type))boxes(at+header,at+size,depth+1);at+=size;}}boxes(0,bytes.length);if(moov<0||mdat<0||moov>mdat||bytes.toString('ascii',4,8)!=='ftyp')throw new Error();}
export async function validatePublishingVideo(bytes:Buffer){
 if(!bytes.length||bytes.length>MAX_PUBLISHING_MEDIA_BYTES)throw new PlannerError('Bitte ein kurzes H.264-MP4 bis 4 MB vorbereiten.',413);
 let input:import('mediabunny').Input|undefined;
 try{
  assertMp4Structure(bytes);const media=await import('mediabunny');input=new media.Input({source:new media.BufferSource(new Uint8Array(bytes)),formats:media.ALL_FORMATS});const track=await input.getPrimaryVideoTrack();if(!track||await track.getCodec()!=='avc')throw new Error();
  const[width,height,duration,stats]=await Promise.all([track.getCodedWidth(),track.getCodedHeight(),track.computeDuration(),track.computePacketStats()]);
  if(width>1920||width<320||height>3840||Math.abs(width/height-9/16)>.005||duration<3||duration>90.1||stats.averagePacketRate<23||stats.averagePacketRate>60.1||stats.averageBitrate>25_000_000)throw new Error();
  const audio=await input.getPrimaryAudioTrack();if(audio&&(await audio.getCodec()!=='aac'||await audio.getSampleRate()>48000||await audio.getNumberOfChannels()>2||(await audio.computePacketStats()).averageBitrate>130000))throw new Error();return{width,height,durationMs:Math.round(duration*1000)};
 }catch{throw new PlannerError('Bitte ein passendes H.264-MP4 verwenden: 9:16, 3–90 Sekunden, 23–60 Bilder pro Sekunde und höchstens 4 MB. WebM ist für diese Anbindung nicht geeignet.');}finally{input?.dispose();}
}
export async function preparePublishingBytes(bytes:Buffer,mimeType:string,kind:'image'|'reel'){
 if(!bytes.length||bytes.length>MAX_PUBLISHING_MEDIA_BYTES)throw new PlannerError('Bitte Medien bis 4 MB vorbereiten.',413);
 if(kind==='reel'){if(mimeType!=='video/mp4')throw new PlannerError('Bitte das Reel als MP4 vorbereiten. Eine WebM-Datei wird nicht automatisch umgewandelt.');return{bytes,mimeType:'video/mp4' as const,...await validatePublishingVideo(bytes)};}
 const expected=({'image/jpeg':'jpeg','image/png':'png','image/webp':'webp'} as Record<string,string>)[mimeType];if(!expected)throw new PlannerError('Bitte JPEG, PNG oder WebP vorbereiten.');
 try{
  const image=sharp(bytes,{limitInputPixels:20_000_000,animated:false}),metadata=await image.metadata();if(metadata.format!==expected||(metadata.pages??1)>1||!metadata.width||!metadata.height)throw new Error();
  const width=metadata.autoOrient?.width??metadata.width,height=metadata.autoOrient?.height??metadata.height,ratio=width/height;
  if(ratio<.8-.0001||ratio>1.91+.0001)throw new PlannerError('Für Instagram-Bildposts bitte 4:5, 1:1 oder 1,91:1 verwenden. Der Entwurf wird nicht automatisch beschnitten.');
  const result=await image.rotate().resize({width:Math.max(320,Math.min(1440,width)),withoutEnlargement:false}).flatten({background:'#ffffff'}).toColourspace('srgb').jpeg({quality:94,chromaSubsampling:'4:4:4'}).toBuffer({resolveWithObject:true});
  if(result.data.length>MAX_PUBLISHING_MEDIA_BYTES)throw new Error();return{bytes:result.data,mimeType:'image/jpeg' as const,width:result.info.width,height:result.info.height};
 }catch(error){if(error instanceof PlannerError)throw error;throw new PlannerError('Das Bild konnte nicht sicher als Instagram-JPEG vorbereitet werden. Bitte erneut exportieren.');}
}
async function storePublishingMedia(publicationId:string,kind:'image'|'reel',slideIndex:number,sourceHash:string|undefined,input:{idempotencyKey:string;bytes:Buffer;mimeType:string}):Promise<PublishingMedia>{
 const id=z.uuid().parse(input.idempotencyKey),inputHash=publishingHash(Buffer.concat([Buffer.from(input.mimeType+'\0'),input.bytes])),existing=await readStoredPublishingMedia(id);
 if(existing){if(existing.publicationId!==publicationId||existing.inputHash!==inputHash||existing.data.kind!==kind||existing.data.slideIndex!==slideIndex||sourceHash!==undefined&&existing.data.sourceHash!==sourceHash)throw new PlannerError('Diese Medienkennung wurde bereits für einen anderen Upload verwendet.');return existing.data;}
 const prepared=await preparePublishingBytes(input.bytes,input.mimeType,kind),sha256=publishingHash(prepared.bytes),mode=process.env.VERCEL==='1'?'blob':'local',path=publishingMediaPath(id,prepared.mimeType,mode),token=process.env.PRIVATE_SOCIAL_BLOB_READ_WRITE_TOKEN;
 if(mode==='local'){
  await mkdir(dirname(path),{recursive:true});try{await writeFile(path,prepared.bytes,{flag:'wx',mode:0o600});}catch(error){if((error as NodeJS.ErrnoException).code!=='EEXIST'||publishingHash(await readFile(path))!==sha256)throw new PlannerError('Der Medien-Upload konnte nicht sicher abgeschlossen werden.');}
 }else{
  if(!token)throw new PlannerError('Der eigene private Social-Medienspeicher ist noch nicht eingerichtet.',503);
  try{await put(path,prepared.bytes,{access:'private',token,contentType:prepared.mimeType,addRandomSuffix:false,allowOverwrite:false});}
  catch{const previous=await get(path,{access:'private',token,useCache:false});if(!previous||previous.statusCode!==200||publishingHash(Buffer.from(await new Response(previous.stream).arrayBuffer()))!==sha256)throw new PlannerError('Der Medien-Upload wurde nicht bestätigt. Bitte erneut versuchen.');}
 }
 const media:PublishingMedia={id,sha256,sourceHash:sourceHash??sha256,kind,slideIndex,mimeType:prepared.mimeType,width:prepared.width,height:prepared.height,bytes:prepared.bytes.length,...('durationMs'in prepared?{durationMs:prepared.durationMs}:{}),createdAt:new Date().toISOString()};
 const record:StoredPublishingMedia={data:media,publicationId,inputHash,storageMode:mode,storagePath:path};
 const saved=await mutateRecord<StoredPublishingMedia|null>(PUBLISHING_MEDIA,id,null,current=>{if(current&&(current.inputHash!==inputHash||current.publicationId!==publicationId))throw new PlannerError('Diese Medienkennung gehört zu einem anderen Upload.');return current??record;});return saved!.data;
}

export function storePreparedMedia(row:StoredPublication,input:{idempotencyKey:string;bytes:Buffer;mimeType:string;slideIndex?:number}){return storePublishingMedia(row.entry.id,row.entry.kind==='reel'?'reel':'image',input.slideIndex??row.entry.slideIndex,row.entry.source.snapshotHash,input);}
export function storeUploadedMedia(publicationId:string,input:{idempotencyKey:string;bytes:Buffer;mimeType:string}){
 if(!['image/jpeg','image/png','video/mp4'].includes(input.mimeType))throw new PlannerError('Bitte einen fertigen JPEG-/PNG-Beitrag oder ein H.264-MP4-Reel bis 4 MB auswählen.');
 return storePublishingMedia(publicationId,input.mimeType==='video/mp4'?'reel':'image',0,undefined,input);
}
