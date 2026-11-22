import {isDeepStrictEqual} from 'node:util';
import type { AdminCredentials, AdminSession } from './auth-session';
import {nextPublishingControl,publishingControlCte,publishingModuleEnabled} from './social/publishing/activation';
import 'server-only';
import { neon } from '@neondatabase/serverless';
import type {AnalyticsSession} from './analytics/model';
import {projectLiveSession,type LiveSession} from './analytics/live';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import {replaceLocalFile} from './server/atomic-file';
import path from 'node:path';
import type { CmsState, Inquiry, MediaAsset, Revision, SiteConfig, SiteSettings, WebsiteContent } from './types';
import { seedContent, seedFirstPartyAnalytics, seedMedia } from '@/data/seed';
import { initialAnalyticsSettings } from './server/analytics/settings';
import { useRemoteDatabase } from './database-policy';
import { loadReviewDatabase, seedReviewDatabase, updateReviewDatabase } from './review-database';
import {commercePageRoutes} from './commerce/pages';
import { projectPublicContent, projectPublicSiteConfig } from './public-projection';
import {hasLocalMediaReference,hasRemoteMediaReference,type MediaReferenceAsset} from './media-references';
import {adminInquiry} from './inquiry-view';
import type { AdminMessage } from './admin-i18n/locale';

export class AppError extends Error {
  constructor(message: string, public status = 400, public messages?: readonly AdminMessage[]) {
    super(message);
  }
}
type Row=Record<string,unknown>;
type RecordData=Record<string,unknown>;
interface LocalStore {state:CmsState; records:Record<string,unknown>}
let initialized:Promise<void>|undefined;
let migration:Promise<void>|undefined;
const metrics=globalThis as typeof globalThis & {wsQueryCount?:number;wsQueryBytes?:number};
const blockedUntil=new Map<string,number>();
let localQueue:Promise<unknown>=Promise.resolve();
const directory=path.join(process.cwd(),'.data');
const localPath=path.join(directory,'cms.json');
const sql=useRemoteDatabase(process.env)?neon(process.env.DATABASE_URL!):null;
const databaseIdentity=sql?new URL(process.env.DATABASE_URL!):null;
const sqliteReview = !sql && process.env.VERCEL === '1' && process.env.WS_BLOB_SQLITE === '1';
export const databaseCacheNamespace=databaseIdentity?createHash('sha256').update([databaseIdentity.hostname,databaseIdentity.pathname,databaseIdentity.username].join('|')).digest('hex').slice(0,20):sqliteReview?'review-sqlite':'local-files';

export const defaultSettings:SiteSettings={smtp:{enabled:false,host:'',port:465,secure:true,user:'',from:'',to:'',password:''},retentionDays:365,onboardingComplete:false,siteUrl:process.env.NEXT_PUBLIC_SITE_URL||'http://localhost:3000',storageRegion:'fra1',databaseRegion:'fra1'};
export function databaseConfigured(){return Boolean(sql || sqliteReview && process.env.BLOB_READ_WRITE_TOKEN);}
async function query(statement:string,parameters:unknown[]=[],operation='database.query'):Promise<Row[]>{
  if(!sql)throw new AppError('Die Datenbank ist noch nicht eingerichtet.',503);
  const measured=process.env.WS_DB_DIAGNOSTICS==='1'||process.env.WS_DB_METRICS==='1';
  const started=measured?performance.now():0;
  const rows=await sql.query(statement,parameters) as Row[];
  if(measured){const bytes=Buffer.byteLength(JSON.stringify(rows));metrics.wsQueryCount=(metrics.wsQueryCount||0)+1;metrics.wsQueryBytes=(metrics.wsQueryBytes||0)+bytes;if(process.env.WS_DB_METRICS==='1')console.info(JSON.stringify({event:'ws.database',operation,rows:rows.length,logicalBytes:bytes,durationMs:Math.round(performance.now()-started)}));}
  return rows;
}
function newState():CmsState{return{draft:structuredClone(seedContent),published:structuredClone(seedContent),revision:1,updatedAt:new Date().toISOString(),publishedAt:new Date().toISOString(),revisions:[]};}
function firstPartyAnalyticsSeed() {
  return seedFirstPartyAnalytics && seedContent.config.consent.enabled ? initialAnalyticsSettings(true) : null;
}
async function readLocal():Promise<LocalStore>{
  if (sqliteReview) {
    const snapshot = await loadReviewDatabase();
    if (!snapshot) throw new AppError('Die Datenbank wurde noch nicht eingerichtet.',503);
    return snapshot.store;
  }
  try {
    return JSON.parse(await readFile(localPath,'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    const analytics = firstPartyAnalyticsSeed();
    const store: LocalStore = { state: newState(), records: analytics ? { 'analytics-settings:main': analytics } : {} };
    await mkdir(directory,{recursive:true});
    await writeFile(localPath, JSON.stringify(store), { mode: 0o600 });
    return store;
  }
}
async function withLocal<T>(action:(store:LocalStore)=>T|Promise<T>):Promise<T>{
  if (sqliteReview) return updateReviewDatabase(action);
  const next=localQueue.then(async()=>{const store=await readLocal();const result=await action(store);await mkdir(directory,{recursive:true});const tmp=localPath+'.'+randomUUID()+'.tmp';await writeFile(tmp,JSON.stringify(store),{mode:0o600});await replaceLocalFile(tmp,localPath);return result;});localQueue=next.catch(()=>undefined);return next;
}
export async function initialize():Promise<void>{
  if(initialized)return initialized;
  initialized=(async()=>{
    if (sqliteReview) return;
    if(!sql){if(process.env.VERCEL)throw new AppError('Für die veröffentlichte Website ist DATABASE_URL erforderlich.',503);await withLocal(store=>{for(const asset of seedMedia)store.records['media:'+asset.id]??=asset;});return;}
  })().catch(error=>{initialized=undefined;throw error;});
  return initialized;
}
// Schema work is explicit deployment setup. A cold request never runs DDL or reseeds data.
export async function setupDatabase():Promise<void>{
  if(migration)return migration;
  migration=(async()=>{
    await initialize();
    if (sqliteReview) {
      const analytics = firstPartyAnalyticsSeed();
      const records: Record<string, unknown> = analytics ? { 'analytics-settings:main': analytics } : {};
      for (const asset of seedMedia) records['media:' + asset.id] = asset;
      await seedReviewDatabase({ state: newState(), records });
      return;
    }
    if(!sql)return;
    await query(`CREATE TABLE IF NOT EXISTS ws_site (id TEXT PRIMARY KEY, draft JSONB NOT NULL, published JSONB NOT NULL, revision INTEGER NOT NULL DEFAULT 1, updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), published_at TIMESTAMPTZ)`);
    await query(`CREATE TABLE IF NOT EXISTS ws_records (collection TEXT NOT NULL, id TEXT NOT NULL, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY(collection,id))`);
    await query(`CREATE TABLE IF NOT EXISTS ws_revisions (id TEXT PRIMARY KEY, content JSONB NOT NULL, label TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
    await query(`CREATE INDEX IF NOT EXISTS ws_records_collection_created ON ws_records(collection,created_at DESC)`);
    await query(`CREATE TABLE IF NOT EXISTS ws_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at TIMESTAMPTZ NOT NULL)`);
    const analyticsSeed = firstPartyAnalyticsSeed();
    const inserted = await query(`WITH site AS (
      INSERT INTO ws_site(id,draft,published,published_at) VALUES('main',$1::jsonb,$1::jsonb,now())
      ON CONFLICT(id) DO NOTHING RETURNING id
    ), analytics AS (
      INSERT INTO ws_records(collection,id,data)
      SELECT 'analytics-settings','main',$2::jsonb FROM site WHERE $2::jsonb IS NOT NULL
      ON CONFLICT(collection,id) DO NOTHING
    ) SELECT id FROM site`, [JSON.stringify(seedContent), analyticsSeed ? JSON.stringify(analyticsSeed) : null]);
    if(inserted.length){
      await query(`INSERT INTO ws_revisions(id,content,label) VALUES($1,$2::jsonb,'Erstveröffentlichung')`,[randomUUID(),JSON.stringify(seedContent)]);
      if(seedMedia.length)await query(`INSERT INTO ws_records(collection,id,data) SELECT 'media', asset->>'id', asset FROM jsonb_array_elements($1::jsonb) asset ON CONFLICT(collection,id) DO NOTHING`,[JSON.stringify(seedMedia)]);
    }
  })().catch(error=>{migration=undefined;throw error;});
  return migration;
}
const iso=(value:unknown)=>new Date(value as string).toISOString();
function stateFromRow(row:Row,revisions:Revision[]):CmsState{return{draft:row.draft as WebsiteContent,published:row.same_snapshot?structuredClone(row.draft as WebsiteContent):row.published as WebsiteContent,revision:Number(row.revision),updatedAt:iso(row.updated_at),publishedAt:row.published_at?iso(row.published_at):null,revisions};}
const revisionsQuery=`(SELECT COALESCE(jsonb_agg(r ORDER BY r.created_at DESC),'[]'::jsonb) FROM (SELECT id,label,created_at FROM ws_revisions ORDER BY created_at DESC LIMIT 30) r)`;
function rowRevisions(row:Row):Revision[]{return ((row.revisions||[]) as Row[]).map(r=>({id:String(r.id),label:String(r.label),createdAt:iso(r.created_at)}));}
export async function getState():Promise<CmsState>{await initialize();if(!sql)return structuredClone((await readLocal()).state);const rows=await query(`SELECT draft,CASE WHEN draft=published THEN NULL ELSE published END AS published,draft=published AS same_snapshot,revision,updated_at,published_at,${revisionsQuery} AS revisions FROM ws_site WHERE id='main'`,[],'admin.state');return stateFromRow(rows[0],rowRevisions(rows[0]));}
export async function getPublishedConfig():Promise<SiteConfig>{
  await initialize();
  if(!sql)return structuredClone((await readLocal()).state.published.config);
  const rows=await query("SELECT published->'config' AS config FROM ws_site WHERE id='main'",[],'public.published-config');
  if(!rows[0])throw new AppError('Die Website ist noch nicht eingerichtet.',503);
  return rows[0].config as SiteConfig;
}
export async function getPublished():Promise<WebsiteContent>{await initialize();if(!sql)return structuredClone((await readLocal()).state.published);const rows=await query(`SELECT published FROM ws_site WHERE id='main'`);return rows[0].published as WebsiteContent;}
export async function getDraftConfig():Promise<SiteConfig>{await initialize();if(!sql)return structuredClone((await readLocal()).state.draft.config);const rows=await query(`SELECT draft->'config' AS config FROM ws_site WHERE id='main'`,[],'admin.module-config');if(!rows[0])throw new AppError('Die Website ist noch nicht eingerichtet.',503);return rows[0].config as SiteConfig;}
export async function getPublicSnapshot(slug?:string):Promise<{content:WebsiteContent;siteUrl:string;cartHref?:string}>{
  await initialize();if(!sql){const published=(await readLocal()).state.published;return{content:projectPublicContent(published,slug),siteUrl:(await getSettings()).siteUrl,cartHref:published.config.modules?.commerce?.enabled?commercePageRoutes(published).cart?.href:undefined};}
  const rows=await query(`SELECT jsonb_build_object('version',1,'config',s.published->'config',
    'pages',COALESCE((SELECT jsonb_agg(CASE WHEN $1::text IS NULL THEN (p.value-'sections')||'{"sections":[]}'::jsonb ELSE p.value END ORDER BY p.position) FROM jsonb_array_elements(s.published->'pages') WITH ORDINALITY AS p(value,position) WHERE $1::text IS NULL OR p.value->>'slug'=$1),'[]'::jsonb),
    'templates',COALESCE((SELECT jsonb_object_agg(t.key,CASE WHEN $1::text IS NULL THEN t.value || '{"sections":[]}'::jsonb ELSE t.value END)
      FROM jsonb_each(COALESCE(s.published->'templates','{}'::jsonb)) t
      WHERE $1::text IS NULL OR t.key=CASE
        WHEN s.published#>>'{config,blog,enabled}'='true' AND $1=s.published#>>'{config,blog,slug}' THEN 'blog-index'
        WHEN s.published#>>'{config,blog,enabled}'='true' AND EXISTS (
          SELECT 1 FROM jsonb_array_elements(COALESCE(s.published->'posts','[]'::jsonb)) p(value)
          WHERE p.value->>'status'='published' AND $1=(s.published#>>'{config,blog,slug}')||'/'||(p.value->>'slug')
        ) THEN 'blog-post'
        WHEN $1 IN ('shop/suche','en/shop/search') THEN 'shop-search'
        WHEN $1 ~ '^(shop/produkt|en/shop/product)/[^/]+$' THEN 'shop-product'
        WHEN $1 ~ '^(shop/kategorie|en/shop/category)/[^/]+$' THEN 'shop-category'
      END),'{}'::jsonb),
    'posts',CASE WHEN s.published#>>'{config,blog,enabled}'='true' THEN COALESCE((SELECT jsonb_agg((p.value-'sections')||jsonb_build_object('sections',CASE WHEN $1::text=COALESCE(s.published#>>'{config,blog,slug}','blog')||'/'||(p.value->>'slug') THEN COALESCE(p.value->'sections','[]'::jsonb) ELSE '[]'::jsonb END) ORDER BY p.position) FROM jsonb_array_elements(COALESCE(s.published->'posts','[]'::jsonb)) WITH ORDINALITY AS p(value,position) WHERE p.value->>'status'='published'),'[]'::jsonb) ELSE '[]'::jsonb END) AS content,
    COALESCE((SELECT data->>'siteUrl' FROM ws_records WHERE collection='settings' AND id='site'),$2) AS site_url,
    CASE WHEN s.published#>>'{config,modules,commerce,enabled}'='true' THEN (SELECT CASE WHEN p.value->>'slug'='' THEN '/' ELSE '/'||(p.value->>'slug') END FROM jsonb_array_elements(s.published->'pages') WITH ORDINALITY AS p(value,position) WHERE EXISTS(SELECT 1 FROM jsonb_array_elements(p.value->'sections') AS section(value) WHERE section.value->>'type'='creator-shop' AND section.value->>'visible'='true' AND section.value#>>'{content,caption}'='cart') ORDER BY p.position LIMIT 1) END AS commerce_cart_href FROM ws_site s WHERE id='main'`,[slug??null,defaultSettings.siteUrl],slug===undefined?'public.index':'public.page');
  if(!rows[0])throw new AppError('Es sind noch keine veröffentlichten Inhalte vorhanden.',503);
  const content=rows[0].content as WebsiteContent;
  return{content:{...content,config:projectPublicSiteConfig(content.config, slug !== undefined)},siteUrl:String(rows[0].site_url),...(rows[0].commerce_cart_href?{cartHref:String(rows[0].commerce_cart_href)}:{})};
}
export async function saveDraft(content:WebsiteContent,revision:number):Promise<CmsState>{
  await initialize();
  if(!sql){await withLocal(store=>{if(store.state.revision!==revision)throw new AppError('Der Entwurf wurde inzwischen geändert. Bitte laden Sie die aktuelle Version neu.',409);const control=nextPublishingControl(store.state.draft.config,content.config,store.records['social-publishing-control:main'] as {epoch:number}|undefined);if(control)store.records['social-publishing-control:main']=control;store.state.draft=structuredClone(content);store.state.updatedAt=new Date().toISOString();store.state.revision++;});}
  else {const rows=await query(`WITH ${publishingControlCte(2,3)} UPDATE ws_site SET draft=$1::jsonb,revision=ws_site.revision+1,updated_at=now() FROM current_site WHERE id='main' AND revision=$2 AND (SELECT count(*) FROM publishing_epoch)>=0 RETURNING CASE WHEN draft=published THEN NULL ELSE published END AS published,draft=published AS same_snapshot,revision,updated_at,published_at,${revisionsQuery} AS revisions`,[JSON.stringify(content),revision,publishingModuleEnabled(content.config)],'admin.save');if(!rows.length)throw new AppError('Der Entwurf wurde inzwischen geändert. Bitte laden Sie die aktuelle Version neu.',409);return stateFromRow({...rows[0],draft:content},rowRevisions(rows[0]));}
  return getState();
}
export async function publish(revision:number):Promise<CmsState>{
  await initialize();const id=randomUUID();const label='Veröffentlichung';
  if(!sql){await withLocal(store=>{if(store.state.revision!==revision)throw new AppError('Bitte speichern oder laden Sie zunächst den aktuellen Entwurf.',409);store.state.published=structuredClone(store.state.draft);store.state.publishedAt=new Date().toISOString();store.state.updatedAt=new Date().toISOString();store.state.revision++;store.state.revisions.unshift({id,label,createdAt:new Date().toISOString(),content:structuredClone(store.state.published)});store.state.revisions=store.state.revisions.slice(0,30);});}
  else {
    const rows=await query(`WITH saved AS (UPDATE ws_site SET published=draft,published_at=now(),updated_at=now(),revision=revision+1 WHERE id='main' AND revision=$1 RETURNING revision,published), history AS (INSERT INTO ws_revisions(id,content,label) SELECT $2,published,$3 FROM saved RETURNING id) SELECT saved.revision FROM saved CROSS JOIN history`,[revision,id,label],'admin.publish');
    if(!rows.length)throw new AppError('Bitte speichern oder laden Sie zunächst den aktuellen Entwurf.',409);
    await query(`DELETE FROM ws_revisions WHERE id NOT IN (SELECT id FROM ws_revisions ORDER BY created_at DESC LIMIT 30)`);
  }
  return getState();
}
export async function restoreRevision(id:string,revision:number):Promise<CmsState>{
  await initialize();let content:WebsiteContent|undefined;
  if(!sql)content=(await readLocal()).state.revisions.find(r=>r.id===id)?.content;
  else {const rows=await query(`SELECT content FROM ws_revisions WHERE id=$1`,[id]);content=rows[0]?.content as WebsiteContent|undefined;}
  if(!content)throw new AppError('Diese Version ist nicht mehr verfügbar.',404);
  return saveDraft(content,revision);
}
export async function getRecord<T>(collection:string,id:string):Promise<T|null>{await initialize();if(!sql)return ((await readLocal()).records[collection+':'+id] as T)??null;const rows=await query(`SELECT data FROM ws_records WHERE collection=$1 AND id=$2`,[collection,id]);return (rows[0]?.data as T)??null;}
export async function getSessionRecord(id: string): Promise<{ session: AdminSession; credentials: AdminCredentials } | null> {
  await initialize();
  if (!sql) {
    const { records } = await readLocal();
    const session = records['sessions:' + id] as AdminSession | undefined;
    const auth = records[session?.accountId ? 'staff-accounts:' + session.accountId : 'auth:admin'] as AdminCredentials | undefined;
    return session && auth ? { session, credentials: { changedAt: auth.changedAt, version: auth.version, role: auth.role, name: auth.name, enabled: auth.enabled } } : null;
  }
  const rows = await query(`SELECT s.data AS session, a.data-'hash' AS credentials
    FROM ws_records s JOIN ws_records a
    ON a.collection=CASE WHEN s.data->>'accountId' IS NULL THEN 'auth' ELSE 'staff-accounts' END
      AND a.id=COALESCE(s.data->>'accountId','admin')
    WHERE s.collection='sessions' AND s.id=$1`, [id], 'admin.session');
  const row = rows[0];
  return row ? { session: row.session as AdminSession, credentials: row.credentials as AdminCredentials } : null;
}

export async function setRecord(collection:string,id:string,data:unknown):Promise<void>{await initialize();if(!sql){await withLocal(store=>{store.records[collection+':'+id]=data as RecordData;});return;}await query(`INSERT INTO ws_records(collection,id,data) VALUES($1,$2,$3::jsonb) ON CONFLICT(collection,id) DO UPDATE SET data=EXCLUDED.data`,[collection,id,JSON.stringify(data)]);}
export async function deleteRecord(collection:string,id:string):Promise<void>{await initialize();if(!sql){await withLocal(store=>{delete store.records[collection+':'+id];});return;}await query(`DELETE FROM ws_records WHERE collection=$1 AND id=$2`,[collection,id]);}
export async function listRecords<T>(collection:string):Promise<T[]>{await initialize();if(!sql){const records=(await readLocal()).records;return Object.entries(records).filter(([k])=>k.startsWith(collection+':')).map(([,v])=>v as T).reverse();}const rows=await query(`SELECT data FROM ws_records WHERE collection=$1 ORDER BY created_at DESC LIMIT 3000`,[collection]);return rows.map(r=>r.data as T);}

export async function listClubMessageRows<T extends {id:string;senderId:string;recipientIds:string[];createdAt:string}>(actorId:string,tab:'inbox'|'sent',before?:{id:string;createdAt:string}):Promise<T[]>{
  await initialize();
  if(!sql){
    const records=(await readLocal()).records;
    return Object.entries(records).filter(([key])=>key.startsWith('club-messages:')).map(([,value])=>value as T)
      .filter(row=>(tab==='sent'?row.senderId===actorId:row.recipientIds.includes(actorId))
        &&(!before||row.createdAt<before.createdAt||row.createdAt===before.createdAt&&row.id<before.id))
      .sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||b.id.localeCompare(a.id)).slice(0,37);
  }
  const rows=await query(`SELECT data FROM ws_records WHERE collection='club-messages'
    AND (CASE WHEN $2::boolean THEN data->>'senderId'=$1 ELSE (data->'recipientIds') ? $1 END)
    AND ($3::text IS NULL OR (data->>'createdAt',id)<($3::text,$4::text))
    ORDER BY data->>'createdAt' DESC,id DESC LIMIT 37`,[actorId,tab==='sent',before?.createdAt??null,before?.id??null],'club.mailbox');
  return rows.map(row=>row.data as T);
}
export async function recordsByKeyRange<T>(collection:string,from:string,to:string):Promise<T[]>{
  await initialize();
  if(!sql){const prefix=collection+':';return Object.entries((await readLocal()).records).filter(([key])=>key.startsWith(prefix)&&key>=prefix+from&&key<=prefix+to).map(([,value])=>value as T);}
  const rows=await query('SELECT data FROM ws_records WHERE collection=$1 AND id BETWEEN $2 AND $3 ORDER BY id',[collection,from,to]);
  return rows.map(row=>row.data as T);
}
export async function deleteCollection(collection:string):Promise<void>{await initialize();if(!sql){await withLocal(store=>{for(const k of Object.keys(store.records))if(k.startsWith(collection+':'))delete store.records[k];});return;}await query(`DELETE FROM ws_records WHERE collection=$1`,[collection]);}
export async function rateLimit(key:string,max:number,windowSeconds:number):Promise<void>{
  const blocked=blockedUntil.get(key);if(blocked&&blocked>Date.now())throw new AppError('Bitte versuchen Sie es in einigen Minuten erneut.',429);
  if(blocked)blockedUntil.delete(key);
  await initialize();
  if(!sql){await withLocal(store=>{const entry=store.records['limit:'+key] as {count:number;reset:number}|undefined;const now=Date.now();if(!entry||entry.reset<now)store.records['limit:'+key]={count:1,reset:now+windowSeconds*1000};else {entry.count++;if(entry.count>max)throw new AppError('Bitte versuchen Sie es in einigen Minuten erneut.',429);}});return;}
  const rows=await query(`INSERT INTO ws_limits(key,count,reset_at) VALUES($1,1,now()+$2*interval '1 second') ON CONFLICT(key) DO UPDATE SET count=CASE WHEN ws_limits.reset_at<now() THEN 1 ELSE ws_limits.count+1 END, reset_at=CASE WHEN ws_limits.reset_at<now() THEN now()+$2*interval '1 second' ELSE ws_limits.reset_at END RETURNING count,reset_at`,[key,windowSeconds]);
  if(Number(rows[0].count)>max){if(blockedUntil.size>=2048)blockedUntil.delete(blockedUntil.keys().next().value!);blockedUntil.set(key,new Date(rows[0].reset_at as string).getTime());throw new AppError('Bitte versuchen Sie es in einigen Minuten erneut.',429);}
}
export async function getSettings():Promise<SiteSettings>{return (await getRecord<SiteSettings>('settings','site'))??structuredClone(defaultSettings);}
export function publicSettings(settings:SiteSettings):SiteSettings{return {...settings,smtp:{...settings.smtp,password:undefined,passwordSet:Boolean(settings.smtp.password)}};}
export async function listInquiries():Promise<Inquiry[]>{
  const settings=await getSettings();const cutoff=Date.now()-settings.retentionDays*86400000;
  if(sql){const rows=await query(`SELECT data FROM ws_records WHERE collection='inquiries' AND created_at >= $1::timestamptz ORDER BY created_at DESC LIMIT 3000`,[new Date(cutoff).toISOString()]);return rows.map(r=>adminInquiry(r.data as Inquiry));}
  const entries=await listRecords<Inquiry>('inquiries');return entries.filter(i=>new Date(i.createdAt).getTime()>=cutoff).map(adminInquiry);
}
export async function listMedia():Promise<MediaAsset[]>{return listRecords<MediaAsset>('media');}
export async function hasRetainedMediaReference(asset:MediaReferenceAsset):Promise<boolean>{
 await initialize();
 if(!sql)return hasLocalMediaReference(await readLocal(),asset);
 return hasRemoteMediaReference((statement,parameters)=>query(statement,parameters,'media.references'),asset);
}
export async function cleanupExpiredSecurityRecords():Promise<void>{
  if(!sql)return;
  await query(`DELETE FROM ws_records WHERE collection IN ('sessions','club-sessions') AND (data->>'expiresAt')::timestamptz < now()`);
  await query(`DELETE FROM ws_limits WHERE reset_at < now()-interval '1 day'`);
}
export async function dailyCleanup():Promise<void>{
  await initialize();if(!sql)return;
  await query(`WITH expired_sessions AS (DELETE FROM ws_records WHERE collection IN ('sessions','club-sessions') AND (data->>'expiresAt')::timestamptz<now()), expired_limits AS (DELETE FROM ws_limits WHERE reset_at<now()), expired_activity AS (DELETE FROM ws_records WHERE collection='admin-activity' AND created_at < now()-interval '90 days') DELETE FROM ws_records WHERE collection='inquiries' AND created_at < now()-COALESCE((SELECT (data->>'retentionDays')::integer FROM ws_records WHERE collection='settings' AND id='site'),365)*interval '1 day'`);
  await query(`DELETE FROM ws_records WHERE collection='reservations-by-date' AND id < to_char((now() AT TIME ZONE 'UTC')::date-COALESCE((SELECT (data->>'retentionDays')::integer FROM ws_records WHERE collection='settings' AND id='site'),365),'YYYY-MM-DD')`);
}
export async function getAdminSnapshot():Promise<{state:CmsState;settings:SiteSettings;media:MediaAsset[];inquiries:Inquiry[]}>{
  await initialize();
  if(!sql){const [state,settings,media,inquiries]=await Promise.all([getState(),getSettings(),listMedia(),listInquiries()]);return{state,settings,media,inquiries};}
  const rows=await query(`SELECT s.draft,CASE WHEN s.draft=s.published THEN NULL ELSE s.published END AS published,s.draft=s.published AS same_snapshot,s.revision,s.updated_at,s.published_at,${revisionsQuery} AS revisions,
    (SELECT data FROM ws_records WHERE collection='settings' AND id='site') AS settings,
    COALESCE((SELECT jsonb_agg(data ORDER BY created_at DESC) FROM ws_records WHERE collection='media'),'[]'::jsonb) AS media,
    COALESCE((SELECT jsonb_agg(q.data ORDER BY q.created_at DESC) FROM (SELECT data,created_at FROM ws_records WHERE collection='inquiries' AND created_at >= now()-COALESCE((SELECT (data->>'retentionDays')::integer FROM ws_records WHERE collection='settings' AND id='site'),365)*interval '1 day' ORDER BY created_at DESC LIMIT 3000) q),'[]'::jsonb) AS inquiries
    FROM ws_site s WHERE id='main'`,[],'admin.bootstrap');
  const row=rows[0];return{state:stateFromRow(row,rowRevisions(row)),settings:(row.settings as SiteSettings)||structuredClone(defaultSettings),media:row.media as MediaAsset[],inquiries:(row.inquiries as Inquiry[]).map(adminInquiry)};
}
export function getQueryCount(){return metrics.wsQueryCount||0;}
export async function saveSnapshots(draft:WebsiteContent,published:WebsiteContent,revision:number,label:string):Promise<CmsState>{
  await initialize();const id=randomUUID();
  if(!sql){await withLocal(store=>{if(store.state.revision!==revision)throw new AppError('Der Entwurf wurde inzwischen geändert. Bitte laden Sie die aktuelle Version neu.',409);const control=nextPublishingControl(store.state.draft.config,draft.config,store.records['social-publishing-control:main'] as {epoch:number}|undefined);if(control)store.records['social-publishing-control:main']=control;store.state.draft=structuredClone(draft);store.state.published=structuredClone(published);store.state.revision++;store.state.updatedAt=new Date().toISOString();store.state.publishedAt=store.state.updatedAt;store.state.revisions.unshift({id,label,createdAt:store.state.updatedAt,content:structuredClone(published)});store.state.revisions=store.state.revisions.slice(0,30);});return getState();}
  const rows=await query(`WITH ${publishingControlCte(3,6)}, saved AS (UPDATE ws_site SET draft=$1::jsonb,published=$2::jsonb,revision=ws_site.revision+1,updated_at=now(),published_at=now() FROM current_site WHERE id='main' AND revision=$3 AND (SELECT count(*) FROM publishing_epoch)>=0 RETURNING revision,published), history AS (INSERT INTO ws_revisions(id,content,label) SELECT $4,published,$5 FROM saved RETURNING id) SELECT saved.revision FROM saved CROSS JOIN history`,[JSON.stringify(draft),JSON.stringify(published),revision,id,label,publishingModuleEnabled(draft.config)],'admin.publish-post');
  if(!rows.length)throw new AppError('Der Entwurf wurde inzwischen geändert. Bitte laden Sie die aktuelle Version neu.',409);
  await query(`DELETE FROM ws_revisions WHERE id NOT IN (SELECT id FROM ws_revisions ORDER BY created_at DESC LIMIT 30)`);return getState();
}

export async function updateExistingRecord<T>(collection:string,id:string,update:(record:T)=>T):Promise<T|null>{
  await initialize();
  if(!sql)return withLocal(store=>{
    const key=collection+':'+id,current=store.records[key] as T|undefined;
    if(current===undefined)return null;
    const next=update(structuredClone(current));
    store.records[key]=next;
    return structuredClone(next);
  });
  for(let attempt=0;attempt<12;attempt++){
    const previous=await getRecord<T>(collection,id);
    if(previous===null)return null;
    const next=update(structuredClone(previous));
    if(isDeepStrictEqual(previous,next))return previous;
    const saved=await query('UPDATE ws_records SET data=$3::jsonb WHERE collection=$1 AND id=$2 AND data=$4::jsonb RETURNING data',
      [collection,id,JSON.stringify(next),JSON.stringify(previous)]);
    if(saved.length)return saved[0].data as T;
  }
  throw new AppError('Die Daten wurden gleichzeitig geändert. Bitte versuchen Sie es erneut.',409);
}

/** Optimistic, atomic compare-and-swap for small module aggregates. The updater must be pure and synchronous. */
export async function mutateRecord<T>(collection:string,id:string,initial:T,update:(current:T)=>T):Promise<T>{
 await initialize();
 if(!sql)return withLocal(store=>{const key=collection+':'+id;const current=structuredClone((store.records[key] as T|undefined)??initial);const next=update(current);store.records[key]=next;return structuredClone(next);});
 for(let attempt=0;attempt<12;attempt++){
  const rows=await query('SELECT data FROM ws_records WHERE collection=$1 AND id=$2',[collection,id]);const previous=rows[0]?.data as T|undefined;const next=update(structuredClone(previous??initial));
  const saved=previous===undefined?await query('INSERT INTO ws_records(collection,id,data) VALUES($1,$2,$3::jsonb) ON CONFLICT(collection,id) DO NOTHING RETURNING data',[collection,id,JSON.stringify(next)]):await query('UPDATE ws_records SET data=$3::jsonb WHERE collection=$1 AND id=$2 AND data=$4::jsonb RETURNING data',[collection,id,JSON.stringify(next),JSON.stringify(previous)]);
  if(saved.length)return saved[0].data as T;
 }
 throw new AppError('Die Daten wurden gleichzeitig geändert. Bitte versuchen Sie es erneut.',409);
}

/** Private module CAS: a revocation/settings update fences the write in the same DB statement. */
export type ModuleGuard={collection:string;id:string;expected:unknown;notAfter?:string};
function checkModuleGuard(store:LocalStore,guard:ModuleGuard){if(!isDeepStrictEqual(store.records[guard.collection+':'+guard.id],guard.expected)||(guard.notAfter&&Date.parse(guard.notAfter)<=Date.now()))throw new AppError('Die Freigabe wurde inzwischen geändert. Bitte neu laden.',409);}
export async function guardedMutateRecord<T>(collection:string,id:string,initial:T,update:(current:T)=>T,guard:ModuleGuard):Promise<T>{
 await initialize();if(!sql)return withLocal(store=>{checkModuleGuard(store,guard);const key=collection+':'+id,next=update(structuredClone(store.records[key] as T??initial));store.records[key]=next;return structuredClone(next);});
 for(let attempt=0;attempt<12;attempt++){const previous=await getRecord<T>(collection,id),next=update(structuredClone(previous??initial));const rows=await query(`WITH permission AS MATERIALIZED (SELECT data FROM ws_records WHERE collection=$1 AND id=$2 FOR UPDATE), saved AS (INSERT INTO ws_records(collection,id,data) SELECT $3,$4,$5::jsonb WHERE EXISTS(SELECT 1 FROM permission WHERE data=$6::jsonb) AND ($7::timestamptz IS NULL OR clock_timestamp()<$7::timestamptz) AND $8::jsonb IS NULL ON CONFLICT(collection,id) DO NOTHING RETURNING data), changed AS (UPDATE ws_records SET data=$5::jsonb WHERE collection=$3 AND id=$4 AND data=$8::jsonb AND EXISTS(SELECT 1 FROM permission WHERE data=$6::jsonb) AND ($7::timestamptz IS NULL OR clock_timestamp()<$7::timestamptz) RETURNING data) SELECT data FROM saved UNION ALL SELECT data FROM changed`,[guard.collection,guard.id,collection,id,JSON.stringify(next),JSON.stringify(guard.expected),guard.notAfter??null,previous===null?null:JSON.stringify(previous)]);if(rows.length)return rows[0].data as T;const current=await getRecord(guard.collection,guard.id);if(!isDeepStrictEqual(current,guard.expected)||(guard.notAfter&&Date.parse(guard.notAfter)<=Date.now()))throw new AppError('Die Freigabe wurde inzwischen geändert. Bitte neu laden.',409);}
 throw new AppError('Die Daten wurden gleichzeitig geändert. Bitte erneut versuchen.',409);
}
export async function recordPage<T>(collection:string,after:string|null,from:string,to:string):Promise<Array<{id:string;data:T}>>{
 await initialize();if(!sql)return Object.entries((await readLocal()).records).filter(([k,v])=>k.startsWith(collection+':')&&(!after||k.slice(collection.length+1)>after)&&String((v as {startedAt?:string}).startedAt??'')>=from&&String((v as {startedAt?:string}).startedAt??'')<to).sort(([a],[b])=>a<b?-1:a>b?1:0).slice(0,500).map(([k,v])=>({id:k.slice(collection.length+1),data:v as T}));
 const rows=await query(`SELECT id,data FROM ws_records WHERE collection=$1 AND ($2::text IS NULL OR id>$2) AND data->>'startedAt'>=$3 AND data->>'startedAt'<$4 ORDER BY id LIMIT 500`,[collection,after,from,to]);return rows.map(r=>({id:String(r.id),data:r.data as T}));
}
export async function recentAnalyticsSessions(generation:number,from:string,to:string):Promise<LiveSession[]>{
 await initialize();
 if(!sql){
  const sessions=Object.entries((await readLocal()).records).filter(([key])=>key.startsWith('analytics-sessions:')).map(([,value])=>value as AnalyticsSession);
  return sessions.filter(session=>session.generation===generation&&session.updatedAt>=from&&session.updatedAt<=to)
   .sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).slice(0,10001).map(projectLiveSession);
 }
 const rows=await query("SELECT data->>'visitor' AS visitor,data->>'device' AS device,data->>'source' AS source,data->>'startedAt' AS \"startedAt\",data->>'updatedAt' AS \"updatedAt\",data->'pages'->(-1)->>'path' AS path FROM ws_records WHERE collection='analytics-sessions' AND data->>'generation'=$1 AND data->>'updatedAt'>=$2 AND data->>'updatedAt'<=$3 ORDER BY data->>'updatedAt' DESC LIMIT 10001",[String(generation),from,to]);
 return rows as LiveSession[];
}
export async function pruneModuleRecords(collection:string,before:string,field='startedAt'){
 if(!['startedAt','at','createdAt'].includes(field))throw new AppError('Ungültiger Löschfilter.');await initialize();if(!sql){await withLocal(store=>{for(const[k,v]of Object.entries(store.records))if(k.startsWith(collection+':')&&String((v as Record<string,unknown>)[field]??'')<before)delete store.records[k];});return;}await query(`DELETE FROM ws_records WHERE collection=$1 AND data->>$3<$2`,[collection,before,field]);
}
export async function commitAgentOperation(input:{guard:ModuleGuard;receiptId:string;hash:string;result:Record<string,unknown>;draft?:{content:WebsiteContent;revision:number};record?:{collection:string;id:string;data:unknown}}):Promise<Record<string,unknown>>{
 await initialize();const{guard,receiptId,hash,result,draft,record}=input;
 function receipt(previous:unknown){if(!previous)return null;const p=previous as {hash:string;result:Record<string,unknown>};if(p.hash!==hash)throw new AppError('Diese Vorgangskennung wurde bereits für andere Angaben verwendet.',409);return p.result;}
 if(!sql)return withLocal(store=>{checkModuleGuard(store,guard);const old=receipt(store.records['mcp-operations:'+receiptId]);if(old)return old;if(draft){if(store.state.revision!==draft.revision)throw new AppError('Der Entwurf wurde inzwischen geändert. Bitte erneut lesen.',409);store.state.draft=structuredClone(draft.content);store.state.revision++;store.state.updatedAt=new Date().toISOString();}if(record){const k=record.collection+':'+record.id;if(store.records[k])throw new AppError('Dieser Entwurf existiert bereits.',409);store.records[k]=record.data;}store.records['mcp-operations:'+receiptId]={hash,result,createdAt:new Date().toISOString()};return result;});
 const rows=await query(`WITH permission AS MATERIALIZED (SELECT data FROM ws_records WHERE collection=$1 AND id=$2 FOR UPDATE), old AS MATERIALIZED (SELECT data FROM ws_records WHERE collection='mcp-operations' AND id=$3), saved AS (UPDATE ws_site SET draft=$4::jsonb,revision=revision+1,updated_at=now() WHERE id='main' AND $4::jsonb IS NOT NULL AND revision=$5 AND NOT EXISTS(SELECT 1 FROM old) AND EXISTS(SELECT 1 FROM permission WHERE data=$6::jsonb) AND clock_timestamp()<$7::timestamptz RETURNING revision), inserted AS (INSERT INTO ws_records(collection,id,data) SELECT $8,$9,$10::jsonb WHERE $8::text IS NOT NULL AND NOT EXISTS(SELECT 1 FROM old) AND EXISTS(SELECT 1 FROM permission WHERE data=$6::jsonb) AND clock_timestamp()<$7::timestamptz ON CONFLICT(collection,id) DO NOTHING RETURNING id), logged AS (INSERT INTO ws_records(collection,id,data) SELECT 'mcp-operations',$3,$11::jsonb WHERE EXISTS(SELECT 1 FROM saved) OR EXISTS(SELECT 1 FROM inserted) RETURNING data) SELECT data FROM logged UNION ALL SELECT data FROM old WHERE EXISTS(SELECT 1 FROM permission WHERE data=$6::jsonb) AND clock_timestamp()<$7::timestamptz`,[guard.collection,guard.id,receiptId,draft?JSON.stringify(draft.content):null,draft?.revision??0,JSON.stringify(guard.expected),guard.notAfter??new Date(Date.now()+60000).toISOString(),record?.collection??null,record?.id??null,record?JSON.stringify(record.data):null,JSON.stringify({hash,result,createdAt:new Date().toISOString()})]);
 if(!rows.length)throw new AppError('Der Entwurf oder die Freigabe wurde inzwischen geändert. Bitte erneut lesen.',409);return receipt(rows[0].data)!;
}

export async function moduleLastUsage(collection:string):Promise<Record<string,string>>{await initialize();if(!sql){const usage:Record<string,string>={};for(const[k,value]of Object.entries((await readLocal()).records)){if(!k.startsWith(collection+':'))continue;const v=value as {keyId:string;at:string};if(!usage[v.keyId]||v.at>usage[v.keyId])usage[v.keyId]=v.at;}return usage;}const rows=await query("SELECT data->>'keyId' AS key, max(data->>'at') AS at FROM ws_records WHERE collection=$1 GROUP BY data->>'keyId'",[collection]);return Object.fromEntries(rows.map(r=>[String(r.key),String(r.at)]));}
