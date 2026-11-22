import {cookies} from 'next/headers';
import {z} from 'zod';
import {AppError,rateLimit} from '@/lib/db';
import {handler,ipKey,json,readJson,sameOrigin} from '@/lib/http';
import {requirePublishingEnabled} from '@/lib/server/social/publishing/store';
import {connectorService} from '@/lib/server/social/connectors/runtime';
import {connectorActor} from '@/lib/server/social/connectors/admin-auth';
import {ConnectorError} from '@/lib/server/social/connectors/provider-contract';

export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=60;
async function call(request:Request){
 try{
  if(request.method!=='GET')sameOrigin(request);const actor=await connectorActor();await requirePublishingEnabled();await rateLimit(ipKey(request,'native-connectors:'+actor.sessionId),30,60);
  const url=new URL(request.url),action=url.pathname.split('/connectors/')[1];
  if(request.method==='GET'&&action==='workspace'){const flow=url.searchParams.get('flow');return json({ok:true,result:await connectorService.workspace(actor,flow?z.uuid().parse(flow):undefined)});}
  if(request.method!=='POST')throw new AppError('Diese Verbindungsfunktion ist nicht verfügbar.',404);
  const input=await readJson(request,12000);
  if(action==='authorize'){const{cookie,...result}=await connectorService.authorize(actor,input);(await cookies()).set(cookie.name,cookie.value,{path:cookie.path,maxAge:cookie.maxAge,httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production'});return json({ok:true,result});}
  const result=action==='app/save'?await connectorService.saveApp(actor,input):action==='choose'?await connectorService.choose(actor,input):action==='instagram/system-user'?await connectorService.instagramSystem(actor,input):action==='bluesky'?await connectorService.bluesky(actor,input):action==='check'?await connectorService.check(actor,input):action==='disconnect'?await connectorService.disconnect(actor,input):null;
  if(!result)throw new AppError('Diese Verbindungsfunktion ist nicht verfügbar.',404);return json({ok:true,result});
 }catch(error){if(error instanceof ConnectorError)throw new AppError(error.message,error.kind==='permission'?403:error.kind==='transient'?503:409);throw error;}
}
export const GET=handler(call);export const POST=handler(call);
