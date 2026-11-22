import { inspectVideo } from './video-input';
import { VIDEO_MIME_TYPES, VIDEO_PREFIX, videoUploadSchema, type VideoAsset, type VideoUpload } from './video-model';

type Grant={mode:'local'}|{mode:'blob';pathname:string;uploadToken:string;ticket:string;expiresAt:number};
export async function uploadStudioVideo(file:File,onProgress:(progress:number)=>void=()=>{}):Promise<VideoAsset>{
 const mimeType=VIDEO_MIME_TYPES.find(type=>type===file.type)||(!file.type?(/\.mp4$/i.test(file.name)?'video/mp4':/\.webm$/i.test(file.name)?'video/webm':undefined):undefined);
 if(!mimeType)throw new Error('Wählen Sie ein MP4- oder WebM-Video.');
 const parsed=videoUploadSchema.safeParse({id:crypto.randomUUID(),name:file.name.trim().replace(/[/\\\u0000-\u001f\u007f]/g,'').slice(0,200)||'Video',mimeType,size:file.size});
 if(!parsed.success)throw new Error(parsed.error.issues[0]?.message||'Die Videodatei ist ungültig.');
 const upload:VideoUpload=parsed.data;
 await inspectVideo(file,upload.mimeType);
 async function send<T>(path:string,body:BodyInit,headers:HeadersInit):Promise<T>{
  const response=await fetch(VIDEO_PREFIX+path,{method:'POST',body,headers});
  const data=await response.json().catch(()=>null);
  if(!response.ok||!data?.ok)throw new Error(data?.error||'Der Video-Upload konnte nicht abgeschlossen werden.');
  return data.result;
 }
 const grant=await send<Grant>('init',JSON.stringify(upload),{'Content-Type':'application/json'});
 if(grant.mode==='local'){
  const query=new URLSearchParams({id:upload.id,name:upload.name,size:String(upload.size)});
  const video=await send<VideoAsset>('local?'+query,file,{'Content-Type':upload.mimeType});
  onProgress(100);
  return video;
 }
 const {put}=await import('@vercel/blob/client');
 await put(grant.pathname,file,{access:'private',token:grant.uploadToken,contentType:upload.mimeType,multipart:file.size>5*1024*1024,onUploadProgress:event=>onProgress(Math.min(98,Math.round(event.percentage)))});
 const body=JSON.stringify({...upload,ticket:grant.ticket,expiresAt:grant.expiresAt});
 const complete=()=>send<VideoAsset>('complete',body,{'Content-Type':'application/json'});
 let video:VideoAsset;
 try{video=await complete();}catch(error){
  if(!(error instanceof TypeError))throw error;
  video=await complete();
 }
 onProgress(100);return video;
}
