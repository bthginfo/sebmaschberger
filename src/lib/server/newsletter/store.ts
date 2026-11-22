import 'server-only';
import {publishedContent,canonicalUrl} from '@/lib/content';
import {getRecord,mutateRecord} from '@/lib/db';
import {sendNewsletterMail,newsletterMailReady} from '@/lib/mail';
import {createNewsletter} from '@/lib/newsletter/service';
import type {State} from '@/lib/newsletter/model';

export const newsletter=createNewsletter({
 read:()=>getRecord<State>('newsletter','workspace'),
 mutate:async update=>(await mutateRecord<State|null>('newsletter','workspace',null,update))!,
 async brand(){
  const [{config},origin]=await Promise.all([publishedContent(),canonicalUrl()]);
  const place=[config.postalCode,config.city].filter(Boolean).join(' ');
  const address=[config.address,config.address.includes(place)?'':place].filter(Boolean).join('\n');
  return {name:config.name,legalName:config.legalName,origin,address,email:config.email};
 },
 ready:newsletterMailReady,
 mail:sendNewsletterMail,
});
