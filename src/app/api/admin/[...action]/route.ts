import { z } from 'zod';
import {revalidateTag} from 'next/cache';
import {revalidatePublishedSite} from '@/lib/publishing-cache';
import { checkPassword, createSession, logout, requireAdmin, changePassword } from '@/lib/auth';
import { AppError, databaseConfigured, defaultSettings, deleteRecord, getAdminSnapshot, getQueryCount, getRecord, getSettings, getState, listInquiries, listMedia, publicSettings, publish, rateLimit, restoreRevision, saveDraft, saveSnapshots, setRecord, updateExistingRecord } from '@/lib/db';
import { handler, ipKey, json, readJson, sameOrigin } from '@/lib/http';
import { encrypt, hashPassword } from '@/lib/security';
import { settingsSchema, websiteSchema } from '@/lib/validation';
import { launchPublicationIssues } from '@/lib/launch-content.mjs';
import { deliverWithdrawalReceipt } from '@/lib/commerce/withdrawal-service';
import { sendTestMail } from '@/lib/mail';
import { blogRouteIssueMessages, publicationIssueText, publishIssueMessages } from '@/lib/publish-check';
import type { AdminMessage } from '@/lib/admin-i18n/locale';
import type { Inquiry, MediaAsset, SiteSettings } from '@/lib/types';
import {defaultBlog} from '@/lib/site-config';
import {uploadEditorMedia,deleteEditorMedia} from '@/lib/editor-media';
import { staffLogin } from '@/lib/team/model';
import { canUseAdminAction, workspaceRoles } from '@/lib/team/permissions';
import { editorialDraft } from '@/lib/team/editor-draft';
import { noteActivity } from '@/lib/team/activity';
import { limitedBody, BodyLimitError } from '@/lib/business/request-body';
import { adminInquiry } from '@/lib/inquiry-view';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=30;

function assertNoPublicationIssues(issues: AdminMessage[], limit = 1) {
  if (!issues.length) return;
  const messages = issues.slice(0, limit);
  throw new AppError(messages.map(publicationIssueText).join('\n'), 400, messages);
}
const revisionSchema=z.number().int().positive();
const idSchema=z.string().min(1).max(150);
const route=handler(async(request:Request)=>{
  const action=new URL(request.url).pathname.replace(/^\/api\/admin\//,'').replace(/\/$/,'');
  const method=request.method;
  if(method!=='GET')sameOrigin(request);
  if(action==='login'&&method==='POST'){
    const {password,login}=z.object({password:z.string().min(1).max(1000),login:staffLogin.optional()}).strict().parse(await readJson(request,3000));
    await rateLimit(ipKey(request,'login'),8,15*60);
    const verified=await checkPassword(password,login);
    if(!verified)throw new AppError('Die Zugangsdaten sind nicht korrekt.',401);
    await createSession(verified,login);return json({ok:true});
  }
  const session=await requireAdmin(workspaceRoles);
  const role=session.role!;
  if(!canUseAdminAction(role,action,method))throw new AppError('Ihr Zugang hat für diese Funktion keine Berechtigung.',403);
  if(action==='logout'&&method==='POST'){await logout();return json({ok:true});}
  if(action==='diagnostics'&&method==='GET'&&process.env.WS_DB_DIAGNOSTICS==='1')return json({queries:getQueryCount()});
  if(action==='bootstrap'&&method==='GET'){
    if(role!=='owner'){
      const [state,media]=await Promise.all([getState(),role==='editor'?listMedia():[]]);
      if(role==='shop'){
        const config={...state.published.config,modules:{commerce:state.published.config.modules?.commerce
          ? {...state.published.config.modules.commerce,products:[],productGroups:[],taxRules:[],shippingZones:[]}:undefined}};
        state.draft=state.published={version:1,config,pages:[]};
      }
      state.revisions=[];
      return json({state,settings:defaultSettings,media,inquiries:[],account:{role,name:session.name},system:{database:databaseConfigured(),blob:Boolean(process.env.BLOB_READ_WRITE_TOKEN),smtp:false,region:'fra1',mode:process.env.VERCEL?'production':'development',initialized:true}});
    }
    const {state,settings,media,inquiries}=await getAdminSnapshot();
    const launchIssues=launchPublicationIssues(state.published,settings.siteUrl);
    return json({state,settings:publicSettings(settings),media,inquiries,system:{database:databaseConfigured(),blob:Boolean(process.env.BLOB_READ_WRITE_TOKEN),smtp:settings.smtp.enabled,region:'fra1',mode:process.env.VERCEL?'production':'development',initialized:true,launchIssues}});
  }
  if(action==='content'&&method==='PUT'){
    const {content,revision}=z.object({content:websiteSchema,revision:revisionSchema}).parse(await readJson(request));
    let draft=content;
    if(role==='editor'){
      const current=await getState();
      if(current.revision!==revision)throw new AppError('Der Entwurf wurde inzwischen geändert. Bitte laden Sie den aktuellen Stand neu.',409);
      draft=editorialDraft(websiteSchema.parse(current.draft),content);
    }
    const state=await saveDraft(draft,revision);
    await noteActivity(session,'draft.saved',String(state.revision));
    if(role==='editor')state.revisions=[];
    return json({state});
  }
  if(action==='commerce-visibility'&&method==='POST'){
    await rateLimit(ipKey(request,'commerce-visibility'),20,60);
    const {enabled,revision}=z.object({enabled:z.boolean(),revision:revisionSchema}).strict().parse(await readJson(request,3000));
    const current=await getState();
    if(current.revision!==revision)throw new AppError('Der Shopstatus wurde inzwischen geändert. Bitte laden Sie den aktuellen Stand neu.',409);
    const draft=current.draft.config.modules?.commerce, published=current.published.config.modules?.commerce;
    if(!draft||!published)throw new AppError('Veröffentlichen Sie zuerst die Shop-Einrichtung.',409);
    if(draft.enabled===enabled&&published.enabled===enabled)return json({state:current});
    draft.enabled=enabled;
    published.enabled=enabled;
    const label=enabled?'Shop eingeblendet':'Shop ausgeblendet';
    const state=await saveSnapshots(current.draft,current.published,revision,label);
    revalidatePublishedSite();
    return json({state});
  }
  if(action==='publish'&&method==='POST'){
    const {revision}=z.object({revision:revisionSchema}).parse(await readJson(request));
    const draft=await getState();if(draft.revision!==revision)throw new AppError('Der Entwurf wurde inzwischen geändert. Bitte laden Sie die aktuelle Version neu.',409);
    assertNoPublicationIssues(publishIssueMessages(draft.draft), 3);
    const state=await publish(revision);revalidatePublishedSite();await noteActivity(session,'site.published',String(state.revision));return json({state});
  }
  if(action==='restore'&&method==='POST'){
    const {id,revision}=z.object({id:idSchema,revision:revisionSchema}).parse(await readJson(request));
    return json({state:await restoreRevision(id,revision)});
  }
  if(action.startsWith('blog/')&&method==='POST'){
    const operation=z.enum(['publish','unpublish','delete','settings']).parse(action.split('/')[1]);
    const {id,revision}=z.object({id:idSchema.optional(),revision:revisionSchema}).parse(await readJson(request,5000));
    const current=await getState();if(current.revision!==revision)throw new AppError('Der Entwurf wurde inzwischen geändert. Bitte laden Sie den aktuellen Stand neu.',409);
    const draft=structuredClone(current.draft);const published=structuredClone(current.published);
    let label='Blog-Einstellungen';
    if(operation==='settings'){
      const config=draft.config.blog??structuredClone(defaultBlog);const previous=published.config.blog??defaultBlog;
      if(config.enabled&&(!config.title.trim()||!config.navLabel.trim()))throw new AppError('Bitte ergänzen Sie Titel und Navigationsname für den Blog.');
      published.config.blog=structuredClone(config);published.config.navigation=published.config.navigation.filter(link=>link.href!==`/${previous.slug}`);draft.config.navigation=draft.config.navigation.filter(link=>link.href!==`/${previous.slug}`);
      if(config.enabled&&config.showInNavigation){const link={label:config.navLabel,href:`/${config.slug}`};published.config.navigation.push(link);draft.config.navigation.push({...link});}
    }else{
      const post=draft.posts?.find(post=>post.id===id);if(!post)throw new AppError('Dieser Beitrag wurde nicht gefunden.',404);
      if(operation==='publish'){
        if(!post.title.trim()||!post.slug||!post.author.trim())throw new AppError('Bitte ergänzen Sie Titel, Seitenadresse und Verfasser des Beitrags.');
        assertNoPublicationIssues(publishIssueMessages({version:1,config:draft.config,pages:[{id:'post',slug:'',title:post.title,locale:'de',seo:post.seo,sections:post.sections}]}));
        if(!post.sections.length)throw new AppError('Bitte ergänzen Sie den Inhalt des Beitrags.');
        post.status='published';post.updatedAt=new Date().toISOString();published.posts=[...(published.posts??[]).filter(p=>p.id!==id),structuredClone(post)];label=`Beitrag: ${post.title}`;
      }else if(operation==='unpublish'){post.status='draft';published.posts=(published.posts??[]).filter(p=>p.id!==id);label=`Beitrag zurückgezogen: ${post.title}`;}
      else{draft.posts=(draft.posts??[]).filter(p=>p.id!==id);published.posts=(published.posts??[]).filter(p=>p.id!==id);label=`Beitrag gelöscht: ${post.title}`;}
    }
    if(operation==='publish'||operation==='settings')assertNoPublicationIssues(blogRouteIssueMessages(published));
    const state=await saveSnapshots(draft,published,revision,label);revalidatePublishedSite();return json({state});
  }
  if(action==='settings'&&method==='GET')return json({settings:publicSettings(await getSettings())});
  if(action==='settings'&&method==='PUT'){
    const {settings}=z.object({settings:settingsSchema}).parse(await readJson(request,25000));const previous=await getSettings();
    const next:SiteSettings={...settings,storageRegion:'fra1',databaseRegion:'fra1',smtp:{...settings.smtp,password:settings.smtp.password?encrypt(settings.smtp.password):previous.smtp.password,passwordSet:undefined}};
    await setRecord('settings','site',next);revalidateTag('ws-settings',{expire:0});if(next.siteUrl!==previous.siteUrl)revalidatePublishedSite();return json({settings:publicSettings(next)});
  }
  if(action==='settings/test'&&method==='POST'){
    await rateLimit(ipKey(request,'smtp-test'),3,15*60);
    const {to}=z.object({to:z.email().optional()}).parse(await readJson(request,3000));
    await sendTestMail(to);return json({ok:true,message:'Die Testnachricht wurde an die gespeicherte Empfängeradresse versendet.'});
  }
  if(action==='password'&&method==='POST'){
    await rateLimit(ipKey(request,'password'),6,15*60);
    const values=z.object({currentPassword:z.string().max(1000),newPassword:z.string().min(12,'Bitte verwenden Sie mindestens 12 Zeichen.').max(200)}).parse(await readJson(request,5000));
    const verified=await checkPassword(values.currentPassword,session.accountId);
    if(!verified)throw new AppError('Das bisherige Passwort ist nicht korrekt.',400);
    await changePassword(verified,await hashPassword(values.newPassword),session.accountId);return json({ok:true});
  }
  if(action==='media'&&method==='GET')return json({media:await listMedia()});
  if(action==='media'&&method==='POST'){
    const contentType=request.headers.get('content-type')||'';
    if(!contentType.startsWith('multipart/form-data;'))throw new AppError('Bitte wählen Sie ein JPG-, PNG- oder WebP-Bild.',415);
    let bytes:Uint8Array;
    try{bytes=await limitedBody(request,Math.floor(4.4*1024*1024));}
    catch(error){if(error instanceof BodyLimitError)throw new AppError('Bitte verwenden Sie ein Bild mit höchstens 4 MB.',413);throw error;}
    const form=await new Response(new Uint8Array(bytes),{headers:{'Content-Type':contentType}}).formData();
    const file=form.get('file');
    if(!(file instanceof File))throw new AppError('Bitte wählen Sie ein JPG-, PNG- oder WebP-Bild.');
    const asset=await uploadEditorMedia(file,String(form.get('alt')||''));
    await noteActivity(session,'media.uploaded',asset.id);
    return json({asset},201);
  }
  if(action==='media'&&method==='PATCH'){
    const values=z.object({id:idSchema,alt:z.string().max(500).optional(),position:z.enum(['0% 0%','50% 0%','100% 0%','0% 50%','50% 50%','100% 50%','0% 100%','50% 100%','100% 100%']).optional()}).parse(await readJson(request,5000));
    const asset=await updateExistingRecord<MediaAsset>('media',values.id,current=>({...current,...values}));
    if(!asset)throw new AppError('Das Bild wurde nicht gefunden.',404);
    await noteActivity(session,'media.edited',asset.id);return json({asset});
  }
  if(action==='media'&&method==='DELETE'){
    const {id}=z.object({id:idSchema}).parse(await readJson(request,3000));
    await deleteEditorMedia(id);return json({ok:true});
  }
  if(action==='inquiries/withdrawal-receipt'&&method==='POST'){
    await rateLimit(ipKey(request,'withdrawal-receipt'),8,300);
    const {id}=z.object({id:idSchema}).parse(await readJson(request,3000));
    return json({inquiry:adminInquiry(await deliverWithdrawalReceipt(id))});
  }
  if(action==='inquiries'&&method==='GET')return json({inquiries:await listInquiries()});
  if(action==='inquiries'&&method==='PATCH'){
    const values=z.object({id:idSchema,status:z.enum(['new','in-progress','done','spam']).optional(),note:z.string().max(10000).optional()}).parse(await readJson(request,15000));
    const {id,...changes}=values;
    const inquiry=await updateExistingRecord<Inquiry>('inquiries',id,current=>({...current,...changes}));
    if(!inquiry)throw new AppError('Diese Anfrage ist nicht mehr verfügbar.',404);
    return json({inquiry:adminInquiry(inquiry)});
  }
  if(action==='inquiries'&&method==='DELETE'){const {id}=z.object({id:idSchema}).parse(await readJson(request,3000));await deleteRecord('inquiries',id);return json({ok:true});}
  if(action==='inquiries/export'&&method==='GET'){
    const inquiries=await listInquiries();
    const cell=(value:string)=>'"'+(/^[=+\-@\t\r]/.test(value)?"'":'')+value.replaceAll('"','""')+'"';
    const rows=[['Eingang','Name','E-Mail','Telefon','Betreff','Nachricht','Status','Notiz'],...inquiries.map(i=>[i.createdAt,i.name,i.email,i.phone,i.subject,i.message,i.status,i.note])];
    return new Response('\uFEFF'+rows.map(r=>r.map(cell).join(';')).join('\r\n'),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="unternehmen-anfragen.csv"','Cache-Control':'no-store'}});
  }
  if(action==='export'&&method==='GET'){
    const state=await getState();return new Response(JSON.stringify({format:'ws-content-backup-v1',exportedAt:new Date().toISOString(),draft:state.draft,published:state.published},null,2),{headers:{'Content-Type':'application/json; charset=utf-8','Content-Disposition':'attachment; filename="website-inhalte.json"','Cache-Control':'no-store'}});
  }
  throw new AppError('Diese Funktion wurde nicht gefunden.',404);
});
export {route as GET,route as POST,route as PUT,route as PATCH,route as DELETE};
