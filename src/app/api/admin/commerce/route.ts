import {z} from 'zod';
import {AppError} from '@/lib/db';
import {requireAdmin} from '@/lib/auth';
import {json,readJson,sameOrigin} from '@/lib/http';
import {commerceHandler as handler} from '@/lib/commerce/http';
import {attemptOrderMail,adminSnapshot,fulfillOrder,listOrders,uploadDigitalAsset} from '@/lib/commerce/service';
import {noteActivity} from '@/lib/team/activity';
export const runtime='nodejs';export const dynamic='force-dynamic';
export const GET=handler(async()=>{const actor=await requireAdmin(['owner','shop']);return json(actor.role==='shop'?{orders:await listOrders()}:await adminSnapshot());});
export const POST=handler(async(request)=>{sameOrigin(request);const actor=await requireAdmin(['owner','shop']);const value=z.object({action:z.enum(['fulfill','retry-mail']),id:z.string().min(1).max(100),tracking:z.string().max(500).optional()}).parse(await readJson(request,3000));if(value.action==='fulfill')await fulfillOrder(value.id,value.tracking);else await attemptOrderMail(value.id);await noteActivity(actor,`shop.${value.action}`,value.id);return json({orders:await listOrders()});});
export const PUT=handler(async(request)=>{
  sameOrigin(request);await requireAdmin();const limit=4.4*1024*1024;
  if(Number(request.headers.get('content-length')||0)>limit)throw new AppError('Bitte eine Datei bis 4 MB verwenden.',413);
  const reader=request.body?.getReader();if(!reader)throw new AppError('Bitte eine Datei wählen.');const chunks:Uint8Array[]=[];let size=0;
  while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>limit){await reader.cancel();throw new AppError('Bitte eine Datei bis 4 MB verwenden.',413);}chunks.push(part.value);}
  const form=await new Request(request.url,{method:'POST',headers:{'Content-Type':request.headers.get('content-type')||''},body:Buffer.concat(chunks)}).formData();
  const productId=z.string().min(1).max(150).parse(form.get('productId'));const file=form.get('file');if(!(file instanceof File))return json({error:'Bitte eine Datei wählen.'},400);return json(await uploadDigitalAsset(productId,file));
});
