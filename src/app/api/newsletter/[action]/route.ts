import {newsletter} from '@/lib/server/newsletter/store';
import {queryToken,submittedToken} from '@/lib/newsletter/http';
import {newsletterActionPage} from '@/lib/newsletter/render';
import {rateLimit} from '@/lib/db';
import {handler,ipKey} from '@/lib/http';

type Props={params:Promise<{action:string}>};
export const runtime='nodejs';
export async function GET(request:Request,{params}:Props){
 const {action}=await params;
 if(action!=='confirm'&&action!=='unsubscribe')return new Response(null,{status:404});
 const token=queryToken(request);
 return newsletterActionPage(action,token,token?undefined:false);
}
export async function POST(request:Request,{params}:Props){
 const {action}=await params;
 if(action!=='confirm'&&action!=='unsubscribe')return new Response(null,{status:404});
 return handler(async()=>{
  await rateLimit(ipKey(request,'newsletter-action'),40,900);
  const token=await submittedToken(request,action==='unsubscribe');
  const success=Boolean(token)&&await newsletter[action](token);
  return newsletterActionPage(action,'',success);
 })(request);
}
