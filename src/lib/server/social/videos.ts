import 'server-only';
import {resolve} from 'node:path';
import {AppError,getRecord,mutateRecord} from '@/lib/db';
import {VIDEO_COLLECTION} from '@/lib/social/video-model';
import {createVideoStorage,type StoredVideo} from './video-storage';

export function socialVideoStorage(actor:string){
 return createVideoStorage({
  actor,hosted:Boolean(process.env.VERCEL),token:process.env.PRIVATE_SOCIAL_BLOB_READ_WRITE_TOKEN,
  prefix:'social-studio/video',directory:resolve(process.cwd(),'.data','social-assets','video'),
  find:id=>getRecord<StoredVideo>(VIDEO_COLLECTION,id),
  save:async record=>(await mutateRecord<StoredVideo|null>(VIDEO_COLLECTION,record.id,null,current=>{
   if(current&&current.contentHash!==record.contentHash)throw new AppError('Diese Datei gehört zu einem anderen Upload.',409);
   return current??record;
  }))!,
  error:(message,status)=>new AppError(message,status),
 });
}
