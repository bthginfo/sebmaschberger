import {cookies} from 'next/headers';
import {rateLimit} from '@/lib/db';
import {ipKey} from '@/lib/http';
import {connectorService} from '@/lib/server/social/connectors/runtime';
import {callbackDocument,callbackProvider} from '@/lib/server/social/connectors/callback-document';

export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=60;
export async function GET(request:Request){
 const url=new URL(request.url),provider=callbackProvider(url.pathname.split('/').at(-1)!),jar=await cookies(),name='kq_connector_'+provider;
 let result:{id:string;success:boolean}|null=null;
 try{await rateLimit(ipKey(request,'native-callback:'+provider),15,60);if(url.search.length<=12000)result=await connectorService.callback(provider,url.searchParams,jar.get(name)?.value||'');}catch{/* Keep Strict admin cookies unchanged; the staged flow checks the original session. */}
 jar.set(name,'',{path:'/api/social/connectors/callback/'+provider,maxAge:0,httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production'});
 return callbackDocument({origin:url.origin,provider,flowId:result?.id??null,success:result?.success??false,plannerPath:'/admin/social/planner'});
}
