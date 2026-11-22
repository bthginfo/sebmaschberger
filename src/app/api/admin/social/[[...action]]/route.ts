import {z} from 'zod';
import {requireAdmin} from '@/lib/auth';
import {AppError,rateLimit} from '@/lib/db';
import {handler,ipKey,json,readJson,sameOrigin} from '@/lib/http';
import {archiveSocialProject,loadSocialProject,loadSocialWorkspace,requireSocialEnabled,saveSocialBrand,saveSocialProject} from '@/lib/server/social/store';
import {MAX_SOCIAL_IMAGE_BYTES,readSocialAsset,readWebsiteMedia,uploadSocialAsset} from '@/lib/server/social/assets';

import {socialVideoStorage} from '@/lib/server/social/videos';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
async function uploadInput(request:Request){
 const max=MAX_SOCIAL_IMAGE_BYTES+32768;if(Number(request.headers.get('content-length')||0)>max)throw new AppError('Bitte verwenden Sie ein Bild bis 3 MB.',413);
 const type=request.headers.get('content-type')||'';if(!type.startsWith('multipart/form-data;'))throw new AppError('Bitte laden Sie eine Bilddatei hoch.',415);
 const reader=request.body?.getReader();if(!reader)throw new AppError('Die Bilddatei fehlt.');const parts:Uint8Array[]=[];let size=0;
 try{while(true){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>max){await reader.cancel();throw new AppError('Bitte verwenden Sie ein Bild bis 3 MB.',413);}parts.push(next.value);}}finally{reader.releaseLock();}
 const form=await new Response(new Uint8Array(Buffer.concat(parts)),{headers:{'Content-Type':type}}).formData();
 if([...form.keys()].some(key=>!['file','idempotencyKey'].includes(key))||form.getAll('file').length!==1)throw new AppError('Die Bilddaten sind nicht vollständig.');
 const file=form.get('file'),key=z.uuid().parse(form.get('idempotencyKey'));if(!(file instanceof File))throw new AppError('Bitte wählen Sie eine Bilddatei.');
 if(file.size>MAX_SOCIAL_IMAGE_BYTES)throw new AppError('Bitte verwenden Sie ein Bild bis 3 MB.',413);
 return{bytes:Buffer.from(await file.arrayBuffer()),mimeType:file.type,name:file.name,idempotencyKey:key};
}
const route=handler(async(request:Request)=>{
 if(!['GET','HEAD'].includes(request.method))sameOrigin(request);const actor=await requireAdmin();await requireSocialEnabled();
 const action=new URL(request.url).pathname.replace(/^\/api\/admin\/social\/?/,'').replace(/\/$/,'');
 if(action.startsWith('videos/')){
  const storage=socialVideoStorage(actor.id),part=action.slice('videos/'.length);
  if(['GET','HEAD'].includes(request.method))return await storage.read(part,request);
  await rateLimit(ipKey(request,'studio-video'),24,60);
  if(part==='init')return json({ok:true,result:await storage.init(await readJson(request,1600))});
  if(part==='complete')return json({ok:true,result:await storage.complete(await readJson(request,2300))},201);
  if(part==='local')return json({ok:true,result:await storage.local(request)},201);
  throw new AppError('Dieser Upload-Schritt ist nicht verfügbar.',404);
 }
 if(['GET','HEAD'].includes(request.method)){
  if(!action)return json({ok:true,result:await loadSocialWorkspace()});
  if(/^projects\/[a-zA-Z0-9_-]+$/.test(action))return json({ok:true,result:await loadSocialProject(action.slice(9))});
  if(/^(?:assets|media)\/[a-zA-Z0-9_-]+$/.test(action)){const [kind,id]=action.split('/');const file=kind==='assets'?await readSocialAsset(id):await readWebsiteMedia(id);return new Response(file.bytes,{headers:{'Content-Type':file.mimeType,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Disposition':'inline'}});}
 }
 if(request.method==='POST'){
  await rateLimit(ipKey(request,'social-studio'),90,60);
  if(action==='save')return json({ok:true,result:await saveSocialProject(await readJson(request,1_200_000))});
  if(action==='archive')return json({ok:true,result:await archiveSocialProject(await readJson(request,1500))});
  if(action==='brand')return json({ok:true,result:await saveSocialBrand(await readJson(request,8000))});
  if(action==='assets'){await rateLimit(ipKey(request,'social-upload'),20,60);return json({ok:true,result:await uploadSocialAsset(await uploadInput(request))},201);}
 }
 throw new AppError('Diese Social-Studio-Funktion wurde nicht gefunden.',404);
});
export{route as GET,route as HEAD,route as POST};
