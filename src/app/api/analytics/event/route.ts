import {AppError,rateLimit} from '@/lib/db';
import {handler,ipKey,json,readJson,sameOrigin} from '@/lib/http';
import {analytics} from '@/lib/server/analytics/store';
import {AnalyticsError} from '@/lib/server/analytics/service';
export const dynamic='force-dynamic';export const POST=handler(async(request:Request)=>{sameOrigin(request);await rateLimit(ipKey(request,'statistics-event'),240,60);try{await analytics.ingest(await readJson(request,4500),{userAgent:request.headers.get('user-agent')||'',country:request.headers.get('x-vercel-ip-country')||''});return json({ok:true});}catch(e){if(e instanceof AnalyticsError)throw new AppError(e.message,e.status);throw e;}});
