import {getBusinessSettings} from './business/service';
import {brandedEmail,logoBytes} from './business/design';
import 'server-only';
import type {Mail} from './newsletter/model';
import nodemailer from 'nodemailer';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { AppError, setRecord } from './db';
import { smtpSetupId } from './operations/smtp';
import {defaultEmailTemplates,renderEmailTemplate} from './email-templates';
import {publishedContent} from './content';
import {cachedSettings} from './settings-cache';
import { decrypt } from './security';
import type { EmailTemplates, Inquiry, SmtpSettings } from './types';
import {commerceEmail, type CommerceMailDetails} from './commerce/email';
import {withdrawalReceipt} from './commerce/withdrawal';

function blockedAddress(address:string):boolean{
  if(address.includes(':'))return /^(::|::1$|f[cd]|fe[89ab])/i.test(address)||address.startsWith('::ffff:');
  const p=address.split('.').map(Number);return p[0]===0||p[0]===10||p[0]===127||p[0]>=224||(p[0]===169&&p[1]===254)||(p[0]===172&&p[1]>=16&&p[1]<=31)||(p[0]===192&&p[1]===168)||(p[0]===100&&p[1]>=64&&p[1]<=127);
}
export async function validateSmtpHost(settings:SmtpSettings):Promise<string>{
  if(!settings.host||!settings.enabled)throw new AppError('Bitte richten Sie den E-Mail-Versand zuerst ein.');
  if(isIP(settings.host))throw new AppError('Bitte verwenden Sie den öffentlichen Hostnamen Ihres Mailanbieters.');
  if(!/^[a-z\d.-]+\.[a-z]{2,}$/i.test(settings.host))throw new AppError('Bitte geben Sie einen vollständigen SMTP-Hostnamen an.');
  const addresses=await lookup(settings.host,{all:true});
  if(!addresses.length||addresses.some(a=>blockedAddress(a.address)))throw new AppError('Dieser Mailserver kann nicht verwendet werden.');
  return (addresses.find(address=>address.family===4)||addresses[0]).address;
}
async function transport(settings:SmtpSettings){const address=await validateSmtpHost(settings);return nodemailer.createTransport({host:address,port:settings.port,secure:settings.secure,requireTLS:!settings.secure,disableFileAccess:true,disableUrlAccess:true,auth:settings.user?{user:settings.user,pass:decrypt(settings.password||'')}:undefined,connectionTimeout:8000,greetingTimeout:8000,socketTimeout:12000,tls:{servername:settings.host,minVersion:'TLSv1.2',rejectUnauthorized:true}});}
export async function newsletterMailReady(){
 const {smtp}=await cachedSettings();
 return Boolean(process.env.SMTP_ENABLED!=='false'&&smtp.enabled&&smtp.host&&smtp.from);
}
export async function sendNewsletterMail(message:Mail){
 const {smtp,siteUrl}=await cachedSettings();
 if(process.env.SMTP_ENABLED==='false'||!smtp.enabled)throw new AppError('Der E-Mail-Versand ist nicht eingerichtet.',503);
 const mail=await transport(smtp);
 try{
  const result=await mail.sendMail({from:smtp.from,to:message.to,subject:message.subject,text:message.text,html:message.html,messageId:'<'+message.id+'@'+new URL(siteUrl).hostname+'>',
   ...(message.unsubscribe?{headers:{'List-Unsubscribe':'<'+message.unsubscribe+'>','List-Unsubscribe-Post':'List-Unsubscribe=One-Click'}}:{})});
  if(!result.accepted?.length)throw new AppError('Der Mailserver hat die Nachricht abgewiesen.',502);
 }finally{mail.close();}
}
export async function notifyInquiry(inquiry:Inquiry,supplied?:{smtp:SmtpSettings;siteUrl:string;emailTemplates?:EmailTemplates}):Promise<'sent'|'not-configured'>{
 const {smtp,siteUrl,emailTemplates}=supplied||await cachedSettings();if(!smtp.enabled)return'not-configured';const [mail,business]=await Promise.all([transport(smtp),getBusinessSettings()]);
 const values={brand:business.design.brandName,createdAt:new Date(inquiry.createdAt).toLocaleString('de-DE',{timeZone:'Europe/Berlin'}),inquiryId:inquiry.id,adminUrl:siteUrl.replace(/\/$/,'')+'/admin'};
 const subject=renderEmailTemplate(business.templates.contactSubject||emailTemplates?.contactSubject||defaultEmailTemplates.contactSubject,values).replace(/[\r\n]+/g,' '),text=renderEmailTemplate(business.templates.contactBody||emailTemplates?.contactBody||defaultEmailTemplates.contactBody,values),logo=logoBytes(business.design);
 await mail.sendMail({from:smtp.from,to:smtp.to,subject,text,html:brandedEmail({subject,heading:'Eine neue Anfrage ist da.',body:text,actionLabel:'Anfrage im CMS ansehen',actionUrl:values.adminUrl,design:business.design,logoSrc:logo?'cid:brand-logo':undefined,footer:[business.profile.name,business.profile.address,business.profile.email].filter(Boolean).join('\n')}),attachments:logo?[{filename:'logo.png',content:Buffer.from(logo),contentType:'image/png',cid:'brand-logo'}]:[]});return'sent';
}
export async function sendTestMail(to?:string):Promise<void>{
 const {smtp}=await cachedSettings();
 if(to&&to!==smtp.to)throw new AppError('Testnachrichten werden nur an die gespeicherte Empfängeradresse versendet.');
 const mail=await transport(smtp);
 try {
  const result=await mail.sendMail({from:smtp.from,to:smtp.to,subject:'Testnachricht Ihrer Website',text:'Ihr Mailserver hat diese Testnachricht angenommen. Neue Anfragen finden Sie in der Website-Verwaltung.'});
  if(!result.accepted.length)throw new AppError('Der Mailserver hat die Testnachricht nicht angenommen.',502);
 } finally { mail.close(); }
 await setRecord('operation-checkpoints','smtp',{setup:smtpSetupId(smtp),at:new Date().toISOString()});
}

export async function sendCommerceMail(message:CommerceMailDetails&{to:string;brand:string;refunded:boolean;partialRefund?:boolean}):Promise<void>{
 const {smtp,emailTemplates}=await cachedSettings();if(!smtp.enabled)throw new AppError('Der E-Mail-Versand ist nicht eingerichtet.',503);
 const [mail,business]=await Promise.all([transport(smtp),getBusinessSettings()]);
 const kind=message.partialRefund?'partialRefund':message.refunded?'refund':'order';
 const logo=logoBytes(business.design);
 const formatted=commerceEmail({
  kind,details:message,design:business.design,templates:business.templates,fallbackTemplates:emailTemplates,
  logoSrc:logo?'cid:brand-logo':undefined,
  footer:[business.profile.name,business.profile.address,business.profile.email].filter(Boolean).join('\n'),
 });
 const key=message.partialRefund?'partial-'+(message.refundedCents??0):message.refunded?'refund':'paid';
 try {
  await mail.sendMail({from:smtp.from,to:message.to,...formatted,messageId:'<commerce-'+message.orderId+'-'+key+'@'+new URL(message.receiptUrl).hostname+'>',attachments:logo?[{filename:'logo.png',content:Buffer.from(logo),contentType:'image/png',cid:'brand-logo'}]:[]});
 } finally {mail.close();}
}

export async function sendWithdrawalReceipt(inquiry:Inquiry):Promise<'sent'|'not-configured'>{
  const {smtp,siteUrl}=await cachedSettings();
  if(!smtp.enabled)return 'not-configured';
  const [mail,business]=await Promise.all([transport(smtp),getBusinessSettings()]);
  const subject='Eingangsbestätigung für Ihren Widerruf',text=withdrawalReceipt(inquiry),logo=logoBytes(business.design);
  await mail.sendMail({
    from:smtp.from,to:inquiry.email,subject,text,messageId:'<'+inquiry.id+'@'+new URL(siteUrl).hostname+'>',
    html:brandedEmail({subject,heading:subject,body:text,design:business.design,logoSrc:logo?'cid:brand-logo':undefined,footer:[business.profile.name,business.profile.address,business.profile.email].filter(Boolean).join('\n')}),
    attachments:logo?[{filename:'logo.png',content:Buffer.from(logo),contentType:'image/png',cid:'brand-logo'}]:[]
  });
  return 'sent';
}

export async function sendReservationMail(message: { to: string; subject: string; text: string; html?: string }) {
  const { smtp } = await cachedSettings();
  if (process.env.SMTP_ENABLED === 'false' || !smtp.enabled) throw new AppError('Der E-Mail-Versand ist nicht eingerichtet.', 503);
  const mail = await transport(smtp);
  try {
    const result = await mail.sendMail({ from: smtp.from, ...message });
    if (!result.accepted?.length) throw new AppError('Der Mailserver hat die Nachricht abgewiesen.', 502);
  } finally { mail.close(); }
}
