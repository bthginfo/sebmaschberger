import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import type {PublishingMedia} from '@/lib/social/publishing/model';
import {PlannerError} from './types';

export function mediaSignature(value:string,secret:string){if(secret.length<32)throw new PlannerError('Die geschützte Medienfreigabe ist nicht eingerichtet.',503);return createHmac('sha256',createHash('sha256').update('publishing-media:v1\0'+secret).digest()).update(value).digest('base64url');}
export function validateMediaSignature(input:{publication:string;id:string;generation:number;expires:number;signature:string},secret:string,now:number){
 if(!Number.isSafeInteger(input.generation)||input.generation<1||!Number.isSafeInteger(input.expires)||input.expires<now/1000||input.expires>now/1000+3660||!/^[a-zA-Z0-9_-]{43}$/.test(input.signature))throw new PlannerError('Die Medienfreigabe ist abgelaufen oder ungültig.',403);
 const expected=mediaSignature([input.publication,input.id,input.generation,input.expires].join(':'),secret);if(!timingSafeEqual(Buffer.from(expected),Buffer.from(input.signature)))throw new PlannerError('Die Medienfreigabe ist ungültig.',403);
}
export function publishingMediaResponse(media:{bytes:Buffer;data:PublishingMedia},request:Request){
 const total=media.bytes.length,headers:Record<string,string>={'Content-Type':media.data.mimeType,'X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store','Accept-Ranges':'bytes','Content-Disposition':'inline'};let start=0,end=total-1,status=200;
 const invalid=()=>new Response(null,{status:416,headers:{...headers,'Content-Range':`bytes */${total}`}}),range=request.headers.get('range');
 if(range){const match=/^bytes=(\d*)-(\d*)$/.exec(range);if(!match||!match[1]&&!match[2])return invalid();
  if(!match[1]){const suffix=Number(match[2]);if(!Number.isSafeInteger(suffix)||suffix<=0)return invalid();start=Math.max(0,total-suffix);}
  else{start=Number(match[1]);if(match[2]){const requested=Number(match[2]);if(!Number.isSafeInteger(requested))return invalid();end=Math.min(end,requested);}if(!Number.isSafeInteger(start))return invalid();}
  if(start>end||start>=total)return invalid();status=206;headers['Content-Range']=`bytes ${start}-${end}/${total}`;
 }
 headers['Content-Length']=String(end-start+1);return new Response(request.method==='HEAD'?null:new Uint8Array(media.bytes.subarray(start,end+1)),{status,headers});
}
