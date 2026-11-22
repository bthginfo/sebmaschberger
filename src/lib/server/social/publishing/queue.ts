import 'server-only';
import type {PublishingTick} from './scheduler';
import {PlannerError} from './types';
import {PUBLISHING_TOPIC,queueMessageSignature,verifyQueueMessage} from './queue-auth';

export {PUBLISHING_TOPIC} from './queue-auth';
export async function enqueuePublishingTick(message:PublishingTick,options:{delaySeconds:number;retentionSeconds:number;idempotencyKey:string}){
 if(process.env.VERCEL!=='1'||process.env.SOCIAL_PUBLISHING_QUEUE_ENABLED!=='1')throw new PlannerError('Automatisches Senden ist noch nicht eingerichtet.',503);
 const sdk=await import('@vercel/queue');return sdk.send(PUBLISHING_TOPIC,{...message,auth:queueMessageSignature(message,process.env.AUTH_SECRET||'')},{...options,region:'fra1'});
}
export async function handlePublishingCallback(request:Request){
 if(process.env.VERCEL!=='1'||process.env.SOCIAL_PUBLISHING_QUEUE_ENABLED!=='1')return Response.json({error:'Der Warteschlangenempfänger ist nicht freigeschaltet.'},{status:503});
 const sdk=await import('@vercel/queue');let parsed:Awaited<ReturnType<typeof sdk.parseCallback>>;
 try{parsed=await sdk.parseCallback(request.clone());if(parsed.queueName!==PUBLISHING_TOPIC)return Response.json({error:'Diese Warteschlange ist nicht freigegeben.'},{status:403});}catch{return Response.json({error:'Diese Queue-Anfrage ist ungültig.'},{status:400});}
 const callback=sdk.handleCallback(async(payload,metadata)=>{
  try{
   if(metadata.topicName!==PUBLISHING_TOPIC)throw new PlannerError('Diese Warteschlange ist nicht freigegeben.',403);
   const message=verifyQueueMessage(payload,process.env.AUTH_SECRET||'');
   const {publishingScheduler}=await import('./runtime');await publishingScheduler.tick(message);
  }catch{throw new Error('Der geschützte Veröffentlichungsschritt konnte nicht abgeschlossen werden.');}
 },{visibilityTimeoutSeconds:120,retry:(_error,metadata)=>({afterSeconds:metadata.deliveryCount>10?900:60})});
 return callback(request);
}
