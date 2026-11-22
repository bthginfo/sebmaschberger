import {revalidatePath} from 'next/cache';
import {requireAdmin} from '@/lib/auth';
import {AppError,rateLimit} from '@/lib/db';
import {handler,ipKey,json,readJson,sameOrigin} from '@/lib/http';
import {commandInput} from '@/lib/newsletter/model';
import {NewsletterError} from '@/lib/newsletter/service';
import {newsletter} from '@/lib/server/newsletter/store';
import {wakeNewsletter} from '@/lib/server/newsletter/queue';

export const runtime='nodejs';
export const maxDuration=60;
export const GET=handler(async()=>{await requireAdmin();return json(await newsletter.workspace());});
export const POST=handler(async request=>{
 sameOrigin(request);await requireAdmin();await rateLimit(ipKey(request,'newsletter-admin'),45,60);
 const command=commandInput.parse(await readJson(request,150_000));
 try{
  if(command.action!=='pump')await newsletter.command(command);
  if(command.action==='settings')revalidatePath('/datenschutz');
  let wakePending=false;
  if(command.action==='pump'||command.action==='queue'||command.action==='settings'&&command.settings.enabled){
   try{await wakeNewsletter();}catch{wakePending=true;}
  }
  return json({...await newsletter.workspace(),wakePending});
 }catch(error){
  if(error instanceof NewsletterError)throw new AppError(error.message,error.status);
  throw error;
 }
});
