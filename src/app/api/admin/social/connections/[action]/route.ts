import {requireAdmin} from '@/lib/auth';
import {AppError,rateLimit} from '@/lib/db';
import {handler,ipKey,json,readJson,sameOrigin} from '@/lib/http';
import {requirePublishingEnabled} from '@/lib/server/social/publishing/store';
import {savePlannerConnection,checkPlannerConnection,disconnectPlannerConnection} from '@/lib/server/social/publishing/service';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=30;
export const POST=handler(async(request:Request)=>{sameOrigin(request);await requireAdmin();await requirePublishingEnabled();await rateLimit(ipKey(request,'social-publishing-connections'),10,60);const action=new URL(request.url).pathname.split('/').at(-1),input=await readJson(request,10000),result=action==='save'?await savePlannerConnection(input):action==='check'?await checkPlannerConnection(input):action==='disconnect'?await disconnectPlannerConnection(input):null;if(!result)throw new AppError('Diese Verbindungsfunktion wurde nicht gefunden.',404);return json({ok:true,result});});
