import 'server-only';
import {createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
import {QueueClient} from '@vercel/queue';
import {z} from 'zod';
import {newsletter} from './store';

const topic='website-newsletter-v1';
const queue=new QueueClient({region:'fra1'});
const wakeSchema=z.object({id:z.string().uuid(),signature:z.string().regex(/^[a-f0-9]{64}$/)}).strict();
function signature(id:string){
 const secret=process.env.AUTH_SECRET;
 if(!secret||secret.length<32)throw new Error('Newsletter wake signing is unavailable');
 return createHmac('sha256',secret).update(topic+':'+id).digest('hex');
}
export async function wakeNewsletter(delay=0,previous?:string){
 if(!await newsletter.hasPending())return;
 if(process.env.VERCEL_ENV!=='production'){await newsletter.pump();return;}
 const id=randomUUID();
 await queue.send(topic,{id,signature:signature(id)},{delaySeconds:delay,idempotencyKey:previous?'next:'+previous:id});
}
export const newsletterWorker=queue.handleCallback(async (message,metadata)=>{
 const wake=wakeSchema.safeParse(message);
 if(!wake.success||metadata.topicName!==topic||!timingSafeEqual(Buffer.from(wake.data.signature,'hex'),Buffer.from(signature(wake.data.id),'hex')))return;
 const result=await newsletter.pump();
 if(result.remaining)await wakeNewsletter(result.busy?30:4,metadata.messageId);
},{visibilityTimeoutSeconds:120});
