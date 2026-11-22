import {AppError,rateLimit} from '@/lib/db';
import {handler,ipKey,json,readJson,sameOrigin} from '@/lib/http';
import {analytics} from '@/lib/server/analytics/store';
import {AnalyticsError} from '@/lib/server/analytics/service';
export const dynamic='force-dynamic';export const POST=handler(async(request:Request)=>{sameOrigin(request);await rateLimit(ipKey(request,'statistics-consent'),120,60);try{return json(await analytics.consent(await readJson(request,2500)));}catch(e){if(e instanceof AnalyticsError)throw new AppError(e.message,e.status);throw e;}});
