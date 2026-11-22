import { randomUUID } from 'node:crypto';
import { after } from 'next/server';
import { handler, ipKey, json, readJson, sameOrigin } from '@/lib/http';
import { AppError, rateLimit, setRecord, updateExistingRecord } from '@/lib/db';
import { inquirySchema } from '@/lib/validation';
import { notifyInquiry } from '@/lib/mail';
import {cachedSettings} from '@/lib/settings-cache';
import type { Inquiry } from '@/lib/types';
import {outcomeProof} from '@/lib/server/analytics/outcome-proof';
import {publishedContent} from '@/lib/content';
import {notifyWorkspaceAccounts} from '@/lib/workspace-push/store';

export const runtime='nodejs';
export const maxDuration=30;
export const POST=handler(async(request:Request)=>{
  sameOrigin(request);
  const body=await readJson(request,20000);
  if(body&&typeof body==='object'&&'website' in body&&body.website)return json({ok:true});
  const data=inquirySchema.parse(body);await rateLimit(ipKey(request,'contact'),5,15*60);const now=new Date().toISOString();const settings=await cachedSettings();
  if(data.kind==='partnership'&&!(await publishedContent()).config.modules?.creator?.enabled)throw new AppError('Das Kooperationsformular ist derzeit nicht verfügbar.',404);
  const inquiry:Inquiry={id:randomUUID(),name:data.name,email:data.email,phone:data.phone,subject:data.kind==='partnership'?'Kooperation · '+data.subject:data.subject,kind:data.kind,message:data.message,createdAt:now,status:'new',note:'',consentAt:now,emailStatus:settings.smtp.enabled?'pending':'not-configured'};
  await setRecord('inquiries',inquiry.id,inquiry);
  after(() => notifyWorkspaceAccounts('cms', ['cms-owner'], 'inquiries'));
  if(settings.smtp.enabled){try{inquiry.emailStatus=await notifyInquiry(inquiry,settings);}catch{inquiry.emailStatus='failed';}await updateExistingRecord<Inquiry>('inquiries',inquiry.id,current=>({...current,emailStatus:inquiry.emailStatus}));}
  return json({ok:true,message:'Vielen Dank. Ihre Anfrage ist bei uns eingegangen. Wir melden uns bei Ihnen.',statisticsProof:outcomeProof(data.kind??'contact',inquiry.id,now)},201);
});
