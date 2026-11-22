import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import type {PublishingTick} from './scheduler';
import {PlannerError} from './types';

export const PUBLISHING_TOPIC='website-social-publishing-v1';
const messageSchema=z.object({publicationId:z.uuid(),generation:z.number().int().positive(),wakeId:z.string().regex(/^[a-f0-9]{64}$/),auth:z.string().regex(/^[a-zA-Z0-9_-]{43}$/)}).strict();
export function queueMessageSignature(message:PublishingTick,secret:string){
 if(secret.length<32)throw new PlannerError('Die Warteschlangenfreigabe ist nicht eingerichtet.',503);
 const key=createHash('sha256').update('publishing-queue:v1\0'+secret).digest();
 return createHmac('sha256',key).update(JSON.stringify([PUBLISHING_TOPIC,message.publicationId,message.generation,message.wakeId])).digest('base64url');
}
export function verifyQueueMessage(input:unknown,secret:string):PublishingTick{
 const data=messageSchema.parse(input),message={publicationId:data.publicationId,generation:data.generation,wakeId:data.wakeId};
 const expected=queueMessageSignature(message,secret);
 if(!timingSafeEqual(Buffer.from(expected),Buffer.from(data.auth)))throw new PlannerError('Diese Warteschlangenfreigabe ist ungültig.',403);
 return message;
}
