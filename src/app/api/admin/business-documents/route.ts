import {z} from 'zod';
import {requireAdmin} from '@/lib/auth';
import {rateLimit,AppError,getSettings} from '@/lib/db';
import {handler,json,sameOrigin,readJson,ipKey} from '@/lib/http';
import {limitedBody,BodyLimitError} from '@/lib/business/request-body';
import {getBusinessSettings,saveBusinessSettings,checkedBusinessSettings,normalizeBusinessLogo,previewDocument,renderConfiguredPdf} from '@/lib/business/service';
import {brandedEmail} from '@/lib/business/design';
import {defaultEmailTemplates,renderEmailTemplate} from '@/lib/email-templates';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=30;
export const GET=handler(async()=>{await requireAdmin();return json({settings:await getBusinessSettings()});});
export const POST=handler(async request=>{sameOrigin(request);await requireAdmin();await rateLimit(ipKey(request,'business-documents'),60,60);
 if(request.headers.get('content-type')?.startsWith('image/')){try{return json({logoDataUrl:await normalizeBusinessLogo(await limitedBody(request,2*1024*1024))});}catch(error){if(error instanceof BodyLimitError)throw new AppError(error.message,413);throw error;}}
 const p=z.object({action:z.enum(['save','pdf','email']),settings:z.unknown(),baseRevision:z.number().int().min(0).optional(),emailKind:z.enum(['order','refund','partialRefund','contact']).optional()}).strict().parse(await readJson(request,250000));
 if(p.action==='save'){if(p.baseRevision===undefined)throw new AppError('Bitte die aktuelle Revision laden.');return json({settings:await saveBusinessSettings(p.settings,p.baseRevision)});}
 const settings=await checkedBusinessSettings(p.settings);
 if(p.action==='pdf'){const bytes=await renderConfiguredPdf(previewDocument({...settings,revision:0}),settings);return new Response(bytes,{headers:{'Content-Type':'application/pdf','Content-Disposition':'inline; filename="gestaltung-vorschau.pdf"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});}
 const kind=p.emailKind||'order',current=await getSettings(),url=new URL(current.siteUrl),values={brand:settings.design.brandName,orderId:'BEISPIEL-1042',items:'2 × Individuelles Produkt · 98,00 €\n1 × Persönliche Beratung · 95,00 €',total:'193,00 €',subtotal:'193,00 €',shipping:'0,00 €',tax:'30,82 €',refundAmount:'49,00 €',receiptUrl:new URL('/checkout/ergebnis?beispiel=1',url.origin).toString(),createdAt:'04.11.2026, 12:00',inquiryId:'BEISPIEL-12',adminUrl:new URL('/admin',url.origin).toString()};
 const defaults=defaultEmailTemplates,subject=renderEmailTemplate(settings.templates[(kind+'Subject') as keyof typeof defaults]||defaults[(kind+'Subject') as keyof typeof defaults],values),text=renderEmailTemplate(settings.templates[(kind+'Body') as keyof typeof defaults]||defaults[(kind+'Body') as keyof typeof defaults],values);
 return json({subject,text,html:brandedEmail({subject,heading:kind==='order'?'Danke für deine Bestellung.':kind==='contact'?'Eine neue Anfrage ist da.':'Deine Rückerstattung',body:text,actionLabel:kind==='contact'?'Anfrage im CMS ansehen':'Bestellung ansehen',actionUrl:kind==='contact'?values.adminUrl:values.receiptUrl,footer:[settings.profile.name,settings.profile.address,settings.profile.email].filter(Boolean).join('\n'),design:settings.design})});
});
