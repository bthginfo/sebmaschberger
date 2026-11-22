import {z} from 'zod';
import {requireAdmin} from '@/lib/auth';
import {AppError,rateLimit} from '@/lib/db';
import {handler,ipKey,json,readJson,sameOrigin} from '@/lib/http';
import {loadPlannerWorkspace,loadPlannerEntry,savePlannerEntry,preparePlannerEntry,uploadPlannerEntry,approvePlannerEntry,cancelPlannerEntry,completePlannerEntry,reopenPlannerEntry,copyPlannerEntry,reconcilePlannerEntry,loadPlannerPreview} from '@/lib/server/social/publishing/service';
import {plannerUploadSchema} from '@/lib/social/publishing/model';
import {requirePublishingEnabled} from '@/lib/server/social/publishing/store';
import {publishingMediaResponse} from '@/lib/server/social/publishing/signed-media';

export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=60;
async function boundedForm(request:Request){
 const max=4*1024*1024+32768;if(!request.headers.get('content-type')?.startsWith('multipart/form-data;'))throw new AppError('Bitte die vorbereitete Datei als Formular hochladen.',415);
 if(Number(request.headers.get('content-length')||0)>max)throw new AppError('Bitte eine Datei bis 4 MB vorbereiten.',413);
 const reader=request.body?.getReader();if(!reader)throw new AppError('Die Datei fehlt.');const chunks:Uint8Array[]=[];let size=0;
 try{for(;;){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>max){await reader.cancel();throw new AppError('Bitte eine Datei bis 4 MB vorbereiten.',413);}chunks.push(next.value);}}finally{reader.releaseLock();}
 return new Response(new Uint8Array(Buffer.concat(chunks)),{headers:{'Content-Type':request.headers.get('content-type')!}}).formData();
}
const route=handler(async(request:Request)=>{
 if(request.method==='POST')sameOrigin(request);const actor=await requireAdmin();await requirePublishingEnabled();
 const path=new URL(request.url).pathname.replace(/^\/api\/admin\/social\/planner\/?/,'').split('/').filter(Boolean);
 if(request.method==='GET'||request.method==='HEAD'){
  if(!path.length&&request.method==='GET')return json({ok:true,result:await loadPlannerWorkspace()});
  if(path.length===2&&path[0]==='media')return publishingMediaResponse(await loadPlannerPreview(path[1]),request);
  if(path.length===1&&request.method==='GET')return json({ok:true,result:await loadPlannerEntry(path[0])});
 }
 if(request.method==='POST'&&path.length===1){
  await rateLimit(ipKey(request,'social-planner'),40,60);const action=path[0];
  if(action==='prepare'||action==='prepare-carousel-item'||action==='upload'){
   const form=await boundedForm(request),file=form.get('file'),keys=action==='upload'?['file','id','idempotencyKey','baseRevision','brandKey','title']:['file','id','idempotencyKey','baseRevision',...(action==='prepare-carousel-item'?['slideIndex']:[])];
   if([...form.keys()].some(key=>!keys.includes(key))||keys.some(key=>form.getAll(key).length!==1))throw new AppError('Bitte genau eine Datei und die vorgesehenen Upload-Angaben übermitteln.');
   if(!(file instanceof File)||!file.size||file.size>4*1024*1024)throw new AppError('Bitte eine Datei bis 4 MB auswählen.',413);
   const bytes=Buffer.from(await file.arrayBuffer());
   if(action==='upload'){const metadata=plannerUploadSchema.parse({...Object.fromEntries(keys.filter(key=>key!=='file').map(key=>[key,form.get(key)])),baseRevision:Number(form.get('baseRevision'))});return json({ok:true,result:await uploadPlannerEntry({metadata,filename:file.name,bytes,mimeType:file.type})});}
   const metadata=z.object({id:z.uuid(),idempotencyKey:z.uuid(),baseRevision:z.coerce.number().int().positive()}).parse(Object.fromEntries(['id','idempotencyKey','baseRevision'].map(key=>[key,form.get(key)])));
   return json({ok:true,result:await preparePlannerEntry({...metadata,bytes,mimeType:file.type,...(action==='prepare-carousel-item'?{slideIndex:z.coerce.number().int().min(0).max(19).parse(form.get('slideIndex'))}:{})})});
  }
  const input=await readJson(request,30000);
  const result=action==='save'?await savePlannerEntry(input):action==='approve'?await approvePlannerEntry(input,'Website-Administration'):action==='cancel'?await cancelPlannerEntry(input):action==='complete'?await completePlannerEntry(input,actor.id):action==='reopen'?await reopenPlannerEntry(input):action==='copy'?await copyPlannerEntry(input):action==='reconcile'?await reconcilePlannerEntry(input):null;
  if(result)return json({ok:true,result});
 }
 throw new AppError('Diese Planerfunktion wurde nicht gefunden.',404);
});export{route as GET,route as HEAD,route as POST};
