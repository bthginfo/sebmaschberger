import {getSettings,rateLimit} from '@/lib/db';
import {ipKey} from '@/lib/http';
import {agentAccess,agentTools} from '@/lib/server/agents/store';
import {agentHttp} from '@/lib/server/agents/transport';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=30;
const route=(request:Request)=>agentHttp(request,{access:agentAccess,adapter:agentTools,origin:async()=>new URL((await getSettings()).siteUrl).origin,limit:key=>rateLimit(key==='request'?ipKey(request,'mcp'):('mcp:'+key),key==='request'?120:60,60),safeError:e=>e instanceof Error&&('status'in e)?e.message:'Die Aufgabe konnte nicht ausgeführt werden. Bitte den aktuellen CMS-Stand prüfen.'});
export{route as POST,route as GET,route as DELETE};
