import {requireAdmin} from '@/lib/auth';
import {AppError,rateLimit} from '@/lib/db';
import {handler,ipKey,json,readJson,sameOrigin} from '@/lib/http';
import {createAssistantProposal,loadAssistantStatus,requireAssistantEnabled} from '@/lib/server/assistant/service';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=30;
const route=handler(async(request:Request)=>{
 if(request.method!=='GET')sameOrigin(request);
 await requireAdmin();await requireAssistantEnabled();
 if(request.method==='GET')return json({ok:true,result:loadAssistantStatus()});
 if(request.method==='POST'){
  await rateLimit(ipKey(request,'cms-assistant'),5,60);
  return json({ok:true,result:await createAssistantProposal(await readJson(request,128000),request.signal)});
 }
 throw new AppError('Diese Assistentenfunktion wurde nicht gefunden.',404);
});
export{route as GET,route as POST};
