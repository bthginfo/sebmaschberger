import {createHmac,timingSafeEqual} from 'node:crypto';
import { initialAnalyticsSettings } from './settings';
import {analyticsConsentSchema,analyticsEventSchema,analyticsSettingsInput,analyticsSettingsSchema,cleanDimension,defaultAnalyticsFilters,publicAnalytics,safeAnalyticsPath,type AnalyticsPublic,type AnalyticsFilters,type AnalyticsSession,type AnalyticsSettings} from '../../analytics/model';
import {buildAnalyticsReport,reportRange} from '../../analytics/report';
import type {AnalyticsOutcome} from '../../analytics/outcome';
import {buildLiveReport,liveMinutes,projectLiveSession,type LiveSession} from '../../analytics/live';
export class AnalyticsError extends Error{constructor(message:string,public status=400){super(message);}}
export type AnalyticsRepository={readSettings:()=>Promise<AnalyticsSettings|null>;mutateSettings:(update:(previous:AnalyticsSettings|null)=>AnalyticsSettings)=>Promise<AnalyticsSettings>;mutateSession:(id:string,settings:AnalyticsSettings,update:(previous:AnalyticsSession|null)=>AnalyticsSession)=>Promise<void>;sessions:(from:string,to:string)=>Promise<AnalyticsSession[]>;recent?:(generation:number,from:string,to:string)=>Promise<LiveSession[]>;cleanup:(before:string)=>Promise<void>;clear:()=>Promise<void>};
const hash=(secret:string,purpose:string,value:string)=>createHmac('sha256',secret).update(purpose+'\0'+value).digest('base64url');
export function createAnalyticsService(repo:AnalyticsRepository,now=()=>new Date()){
 async function settings(){const saved=await repo.readSettings();return saved?analyticsSettingsSchema.parse(saved):null;}
 async function admin(){let s=await settings();if(!s)s=await repo.mutateSettings(p=>p??initialAnalyticsSettings());return{...publicAnalytics(s),revision:s.revision,changedAt:s.changedAt};}
 async function configure(input:unknown){const request=analyticsSettingsInput.parse(input);const saved=await repo.mutateSettings(p=>{const previous=p??initialAnalyticsSettings();if(previous.revision!==request.baseRevision)throw new AnalyticsError('Die Statistik-Einstellungen wurden inzwischen geändert. Bitte neu laden.',409);return{...previous,enabled:request.enabled,everEnabled:previous.everEnabled||request.enabled,retentionDays:request.retentionDays,goals:request.goals.map(g=>({...g,path:safeAnalyticsPath(g.path)!})),revision:previous.revision+1,generation:previous.generation+(previous.enabled!==request.enabled||previous.retentionDays!==request.retentionDays?1:0),changedAt:now().toISOString()};});await repo.cleanup(new Date(now().getTime()-saved.retentionDays*86400000).toISOString()).catch(()=>{});return admin();}
 async function publicConfig():Promise<AnalyticsPublic>{const s=await settings();return s?publicAnalytics(s):{enabled:false,everEnabled:false,generation:1,retentionDays:90,goals:[]};}
 async function consent(input:unknown){const data=analyticsConsentSchema.parse(input),s=await settings();if(!s?.enabled||s.generation!==data.generation)throw new AnalyticsError('Die Statistik ist gerade nicht aktiv. Bitte die Datenschutzeinstellungen erneut öffnen.',409);const at=now().getTime(),payload=Buffer.from(JSON.stringify({v:1,g:s.generation,visitor:hash(s.secret,'visitor',data.visitor),session:hash(s.secret,'session',data.session),expires:at+30*60000})).toString('base64url');return{token:payload+'.'+hash(s.secret,'consent',payload),expiresAt:new Date(at+30*60000).toISOString()};}
 function verifiedConsent(value:string,s:AnalyticsSettings){
  const [payload,signature,...rest]=value.split('.'),expected=hash(s.secret,'consent',payload);if(rest.length||!signature||Buffer.byteLength(signature)!==expected.length||!timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))throw new AnalyticsError('Eine gültige Statistik-Einwilligung ist erforderlich.',401);
  let token:{v:number;g:number;visitor:string;session:string;expires:number};try{token=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));}catch{throw new AnalyticsError('Die Statistik-Freigabe ist ungültig.',401);}
  if(token.v!==1||token.g!==s.generation||!Number.isFinite(token.expires)||token.expires<=now().getTime()||!/^[-_a-zA-Z0-9]{43}$/.test(token.visitor)||!/^[-_a-zA-Z0-9]{43}$/.test(token.session))throw new AnalyticsError('Die Statistik-Freigabe ist abgelaufen.',401);
  return token;
 }
 async function ingest(input:unknown,context:{userAgent:string;country:string}){
  const data=analyticsEventSchema.parse(input),s=await settings();if(!s?.enabled)throw new AnalyticsError('Die Statistik ist ausgeschaltet.',409);
  const token=verifiedConsent(data.token,s);
  const path=safeAnalyticsPath(data.path);if(!path)return;
  if(/bot|crawler|spider|headless|preview|lighthouse/i.test(context.userAgent))return;
  const at=now().toISOString(),ua=context.userAgent.slice(0,500),device=/ipad|tablet|android(?!.*mobile)/i.test(ua)?'tablet':/iphone|mobile/i.test(ua)?'mobile':'desktop',browser=/Edg\//.test(ua)?'Edge':/Firefox\//.test(ua)?'Firefox':/Chrome\//.test(ua)?'Chrome':/Safari\//.test(ua)?'Safari':'Andere',country=/^[A-Z]{2}$/.test(context.country)?context.country:'unbekannt';
  await repo.mutateSession(token.session,s,previous=>{
   if(previous&&previous.generation!==s.generation)throw new AnalyticsError('Diese Statistik-Sitzung ist abgelaufen.',409);
   const session:AnalyticsSession=previous??{id:token.session,visitor:token.visitor,generation:s.generation,startedAt:at,updatedAt:at,device,browser,country,source:cleanDimension(data.source,120)||'direkt',campaign:cleanDimension(data.campaign,100),medium:cleanDimension(data.medium,60),pages:[]};
   if(session.visitor!==token.visitor)throw new AnalyticsError('Die Statistik-Sitzung ist ungültig.',409);
   const page=session.pages.find(p=>p.id===data.pageId);if(page&&page.path!==path)throw new AnalyticsError('Dieser Seitenaufruf gehört zu einer anderen Adresse.',409);
   if(!page){if(session.pages.length>=100)return session;session.pages.push({id:data.pageId,path,enteredAt:at,engagedMs:0,goals:[]});}
   const target=session.pages.find(p=>p.id===data.pageId)!;target.engagedMs=Math.max(target.engagedMs,Math.min(data.engagedMs,Math.max(0,now().getTime()-Date.parse(target.enteredAt))));
   const goal=s.goals.find(g=>g.id===data.goal&&g.path===path);if(goal&&!target.goals.includes(goal.id))target.goals.push(goal.id);
   return{...session,updatedAt:at};
  });
 }
 async function recordOutcome(value:string,pageId:string,outcome:AnalyticsOutcome){
  const s=await settings();if(!s?.enabled)throw new AnalyticsError('Die Statistik ist ausgeschaltet.',409);
  const token=verifiedConsent(value,s);
  await repo.mutateSession(token.session,s,session=>{
   if(!session||session.generation!==s.generation||session.visitor!==token.visitor)throw new AnalyticsError('Kein zugehöriger Seitenaufruf vorhanden.',409);
   const page=session.pages.find(page=>page.id===pageId);
   if(!page||Date.parse(outcome.at)+5000<Date.parse(page.enteredAt))throw new AnalyticsError('Kein zugehöriger Seitenaufruf vorhanden.',409);
   if(session.pages.some(page=>page.outcomes?.some(event=>event.id===outcome.id)))return session;
   if((page.outcomes?.length??0)>=20)return session;
   return {...session,updatedAt:now().toISOString(),pages:session.pages.map(entry=>entry.id===pageId
    ? {...entry,outcomes:[...(entry.outcomes??[]),outcome]} : entry)};
  });
 }
 async function live(){
  const s=await settings(),at=now();
  if(!s?.enabled)return buildLiveReport(false,[],at);
  const from=new Date(+at-liveMinutes*60_000).toISOString(),to=at.toISOString();
  const recent=repo.recent?await repo.recent(s.generation,from,to):(await repo.sessions(new Date(+at-86_400_000).toISOString(),to)).filter(session=>session.generation===s.generation).map(projectLiveSession);
  return buildLiveReport(true,recent,at);
 }
 async function report(input:AnalyticsFilters=defaultAnalyticsFilters()){const s=await settings(),range=reportRange(input);return buildAnalyticsReport(s?await repo.sessions(new Date(Math.max(range.loadFrom-86400000,now().getTime()-s.retentionDays*86400000)).toISOString(),new Date(range.end).toISOString()):[],input,s?.retentionDays??90,now());}
 async function clear(baseRevision:number){await repo.mutateSettings(p=>{if(!p||p.revision!==baseRevision)throw new AnalyticsError('Die Statistik-Einstellungen wurden inzwischen geändert.',409);return{...p,revision:p.revision+1,generation:p.generation+1,changedAt:now().toISOString()};});await repo.clear();return admin();}
 async function cleanup(){const s=await settings();if(s)await repo.cleanup(new Date(now().getTime()-s.retentionDays*86400000).toISOString());}
 return{admin,configure,publicConfig,consent,ingest,live,recordOutcome,report,clear,cleanup};
}
