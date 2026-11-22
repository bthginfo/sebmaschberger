import {AppError,rateLimit} from '@/lib/db';
import {handler,ipKey,json,readJson,sameOrigin} from '@/lib/http';
import {groupInput,subscribeInput} from '@/lib/newsletter/model';
import {NewsletterError} from '@/lib/newsletter/service';
import {newsletter} from '@/lib/server/newsletter/store';

export const runtime='nodejs';
export const GET=handler(async request=>{
 const group=new URL(request.url).searchParams.get('group');
 return json(await newsletter.publicInfo(group?groupInput.shape.id.parse(group):undefined));
});
export const POST=handler(async request=>{
 sameOrigin(request);await rateLimit(ipKey(request,'newsletter-signup'),8,900);
 const input=subscribeInput.parse(await readJson(request,2500));
 try{await newsletter.subscribe(input);}
 catch(error){if(error instanceof NewsletterError)throw new AppError(error.message,error.status);throw error;}
 return json({ok:true});
});
