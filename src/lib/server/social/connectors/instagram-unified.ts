import {INSTAGRAM_UNIFIED_SCOPES} from '../../../social/connectors/model';
import {ConnectorError,providerFetch,providerJson,requiredString,type ProviderApp,type ProviderClient,type ProviderFactoryOptions,type ProviderSession} from './provider-contract';

const GRAPH='https://graph.facebook.com/v26.0/';
const identifier=(value:unknown)=>{const result=requiredString(value,'Meta-Kennung',40);if(!/^\d{5,40}$/.test(result))throw new ConnectorError('Meta hat keine gültige Kennung bestätigt.');return result;};
const configuration=(app:ProviderApp)=>identifier(app.configurationId);

/** Unified Login returns a portfolio system-user token, never an Instagram /me profile. */
export function createInstagramUnifiedClient(options:ProviderFactoryOptions,mediaClient:ProviderClient):ProviderClient{
 const now=()=>options.now?.()??new Date().toISOString();
 async function graph(path:string,accessToken:string,fields:Record<string,string>={}){
  const url=new URL(GRAPH+path);for(const[key,value]of Object.entries(fields))url.searchParams.set(key,value);
  const result=await providerJson(await providerFetch(options,url.href,{headers:{Authorization:'Bearer '+accessToken}}),'Instagram-Verbindung');
  return result;
 }
 async function inspect(app:ProviderApp,session:ProviderSession){
  const data=(await graph('debug_token',app.clientId+'|'+app.clientSecret,{input_token:session.accessToken})).data;
  if(!data||data.is_valid!==true)throw new ConnectorError('Der Instagram-Zugang ist nicht mehr gültig. Bitte erneut verbinden.','expired');
  if(session.extra?.instagramTokenSource==='portfolio-system-user'&&data.type!=='SYSTEM_USER')throw new ConnectorError('Bitte ein eigenes Portfolio-Systemnutzer-Token verwenden. Persönliche Login-Tokens passen hier nicht.','permission');
  if(String(data.app_id)!==app.clientId)throw new ConnectorError('Dieser Instagram-Zugang gehört zu einer anderen Meta-App.','permission');
  if(!Array.isArray(data.scopes)||INSTAGRAM_UNIFIED_SCOPES.some(scope=>!data.scopes.includes(scope)))throw new ConnectorError('Meta hat Profilzugriff und Veröffentlichung nicht vollständig freigegeben.','permission');
  const expiries=[data.expires_at,data.data_access_expires_at].filter((value):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>0);
  if(expiries.some(value=>value*1000<=Date.parse(now())+30000))throw new ConnectorError('Der Instagram-Zugang ist abgelaufen. Bitte erneut verbinden.','expired');
  if(data.expires_at!==0&&!(typeof data.expires_at==='number'&&data.expires_at>0))throw new ConnectorError('Meta hat keine gültige Zugangsdauer bestätigt.');
  const expiresAt=expiries.length?new Date(Math.min(...expiries)*1000).toISOString():null;
  return{scopes:data.scopes.filter((value:unknown):value is string=>typeof value==='string'),expiresAt,nonExpiring:expiresAt===null&&data.expires_at===0,systemUserId:identifier(data.user_id)};
 }
 async function identity(session:ProviderSession){
  if(session.extra?.instagramTokenSource==='portfolio-system-user'){const profile=await graph('me',session.accessToken,{fields:'id'}),systemUserId=identifier(profile.id);if(!session.extra.systemUserId||session.extra.systemUserId!==systemUserId)throw new ConnectorError('Der Portfolio-Systemnutzer dieses Zugangs hat sich geändert. Bitte erneut verbinden.','permission');return{systemUserId,businessId:null};}
  const profile=await graph('me',session.accessToken,{fields:'client_business_id'});
  const systemUserId=identifier(profile.id),businessId=identifier(profile.client_business_id);
  if(session.extra?.systemUserId&&session.extra.systemUserId!==systemUserId||session.extra?.clientBusinessId&&session.extra.clientBusinessId!==businessId)throw new ConnectorError('Das Business-Portfolio dieser Verbindung hat sich geändert. Bitte erneut verbinden.','permission');
  return{systemUserId,businessId};
 }
 async function accounts(session:ProviderSession){
  const found:{id:string;username:string}[]=[],seen=new Set<string>();let after:string|undefined;
  for(let page=0;page<20;page++){
   const result=await graph('me/assigned_instagram_accounts',session.accessToken,{fields:'id,username',limit:'100',...(after?{after}:{})});
   if(!Array.isArray(result.data))throw new ConnectorError('Meta hat keine gültige Instagram-Kontenliste bestätigt.');
   for(const row of result.data){const id=identifier(row?.id),username=requiredString(row?.username,'Instagram-Profilnamen',100);if(found.some(item=>item.id===id))throw new ConnectorError('Die Instagram-Kontenliste ist nicht eindeutig.');found.push({id,username});if(found.length>200)throw new ConnectorError('Bitte weniger Instagram-Konten für diese Verbindung freigeben.');}
   if(!result.paging?.next)return found;
   const cursor=requiredString(result.paging?.cursors?.after,'Seitencursor',4096);if(seen.has(cursor))throw new ConnectorError('Die Instagram-Kontenliste ist unvollständig.');seen.add(cursor);after=cursor;
  }
  throw new ConnectorError('Die Instagram-Kontenliste konnte nicht vollständig geprüft werden.');
 }
 function assertSession(app:ProviderApp,session:ProviderSession){if(app.instagramLoginMode!=='unified'||session.extra?.instagramLoginMode!=='unified'||session.extra.configurationId!==configuration(app))throw new ConnectorError('Die Instagram-Anmeldung passt nicht zur gespeicherten Meta-Konfiguration. Bitte erneut verbinden.','permission');}
 async function verify(app:ProviderApp,session:ProviderSession){
  assertSession(app,session);const inspected=await inspect(app,session),owner=await identity(session);
  if(inspected.systemUserId!==owner.systemUserId)throw new ConnectorError('Meta hat einen anderen Systemnutzer bestätigt.','permission');
  return{inspected,owner};
 }
 const target=(row:{id:string;username:string})=>({id:row.id,label:'@'+row.username,username:row.username,kind:'profile' as const,profileUrl:'https://www.instagram.com/'+encodeURIComponent(row.username)+'/'});
 async function portfolioProfile(session:ProviderSession){
  if(session.extra?.instagramTokenSource!=='portfolio-system-user')throw new ConnectorError('Die direkte Profilprüfung ist nur für den ausdrücklich verbundenen eigenen Systemnutzer verfügbar.','permission');
  const id=identifier(session.extra.portfolioAccountId),profile=await graph(id,session.accessToken,{fields:'id,username'});
  if(identifier(profile.id)!==id)throw new ConnectorError('Meta hat die angegebene Instagram-Konto-ID nicht bestätigt.','permission');
  const username=requiredString(profile.username,'Instagram-Profilnamen',100),limit=await graph(id+'/content_publishing_limit',session.accessToken,{fields:'quota_usage,config'}),quota=Array.isArray(limit.data)&&limit.data.length===1?limit.data[0]:null;
  if(!quota||!Number.isSafeInteger(quota.quota_usage)||quota.quota_usage<0)throw new ConnectorError('Meta hat für dieses Profil keinen gültigen Veröffentlichungszugriff bestätigt. Bitte die Konto-ID und zugewiesenen Inhaltsrechte prüfen.','permission');
  return target({id,username});
 }
 return{
  ...mediaClient,
  authorization(input){const url=new URL('https://www.facebook.com/dialog/oauth');for(const[key,value]of Object.entries({client_id:identifier(input.app.clientId),config_id:configuration(input.app),redirect_uri:input.redirectUri,response_type:'code',display:'popup',override_default_response_type:'true',prompt:'login',state:input.state}))url.searchParams.set(key,value);return url.href;},
  async exchange(input){
   configuration(input.app);const url=new URL(GRAPH+'oauth/access_token');for(const[key,value]of Object.entries({client_id:identifier(input.app.clientId),client_secret:input.app.clientSecret,redirect_uri:input.redirectUri,code:input.code}))url.searchParams.set(key,value);
   const data=await providerJson(await providerFetch(options,url.href),'Instagram-Anmeldung'),at=now();
   const provisional:ProviderSession={accessToken:requiredString(data.access_token,'Instagram-Zugang',128000),expiresAt:null,scopes:[],subject:'',issuedAt:at,extra:{instagramLoginMode:'unified',configurationId:configuration(input.app)}};
   const inspected=await inspect(input.app,provisional),owner=await identity(provisional);
   if(inspected.systemUserId!==owner.systemUserId||!owner.businessId)throw new ConnectorError('Meta hat keinen eindeutigen Systemnutzer bestätigt.','permission');
   return{...provisional,subject:owner.systemUserId,scopes:inspected.scopes,expiresAt:inspected.expiresAt,nonExpiring:inspected.nonExpiring,extra:{...provisional.extra,systemUserId:owner.systemUserId,clientBusinessId:owner.businessId}};
  },
  async importPortfolioAccess({app,accessToken,accountId}){
   if(app.instagramLoginMode!=='unified')throw new ConnectorError('Der eigene Systemnutzer benötigt die gespeicherte Meta-App mit Unified Login.','configuration');
   const provisional:ProviderSession={accessToken:requiredString(accessToken,'Systemnutzer-Zugang',8000),expiresAt:null,scopes:[],subject:'',issuedAt:now(),extra:{instagramLoginMode:'unified',instagramTokenSource:'portfolio-system-user',configurationId:configuration(app),...(accountId?{portfolioAccountId:identifier(accountId)}:{})}};
   const inspected=await inspect(app,provisional),session={...provisional,subject:inspected.systemUserId,scopes:inspected.scopes,expiresAt:inspected.expiresAt,nonExpiring:inspected.nonExpiring,extra:{...provisional.extra,systemUserId:inspected.systemUserId}};
   await verify(app,session);return session;
  },
  async discover({app,session}){
   const {inspected}=await verify(app,session);if(session.extra?.portfolioAccountId){const selected=await portfolioProfile(session);return[{target:selected,session:{...session,subject:selected.id,scopes:inspected.scopes,expiresAt:inspected.expiresAt,nonExpiring:inspected.nonExpiring}}];}const rows=await accounts(session);
   return rows.map(row=>({target:target(row),session:{...session,subject:row.id,scopes:inspected.scopes,expiresAt:inspected.expiresAt,nonExpiring:inspected.nonExpiring}}));
  },
  async check({app,session,target:chosen}){
   if(chosen.kind!=='profile'||identifier(chosen.id)!==session.subject)throw new ConnectorError('Bitte das tatsächlich freigegebene Instagram-Profil auswählen.','permission');
   await verify(app,session);if(session.extra?.portfolioAccountId){if(session.extra.portfolioAccountId!==chosen.id)throw new ConnectorError('Die ausgewählte Konto-ID stimmt nicht mit dem geprüften Profil überein.','permission');return portfolioProfile(session);}const available=await accounts(session),row=available.find(item=>item.id===chosen.id);
   if(!row)throw new ConnectorError('Dieses Instagram-Profil ist im Business-Portfolio nicht mehr für die App freigegeben. Bitte erneut verbinden.','permission');
   const profile=await graph(identifier(row.id),session.accessToken,{fields:'id,username'});
   if(identifier(profile.id)!==row.id)throw new ConnectorError('Meta hat das ausgewählte Professional-Profil nicht bestätigt.','permission');
   return target({id:row.id,username:requiredString(profile.username,'Instagram-Profilnamen',100)});
  },
  async refresh({app,session}){
   if(session.extra?.instagramTokenSource!=='portfolio-system-user')throw new ConnectorError('Bitte Instagram erneut anmelden, um diesen Meta-Zugang zu verlängern.','expired');
   if(!session.expiresAt||Date.parse(session.expiresAt)<=Date.parse(now()))throw new ConnectorError('Der eigene Systemnutzer-Zugang ist abgelaufen. Bitte ein neues Token verbinden.','expired');
   await verify(app,session);const url=new URL(GRAPH+'oauth/access_token');for(const[key,value]of Object.entries({grant_type:'fb_exchange_token',client_id:app.clientId,client_secret:app.clientSecret,set_token_expires_in_60_days:'true',fb_exchange_token:session.accessToken}))url.searchParams.set(key,value);
   const result=await providerJson(await providerFetch(options,url.href),'Systemnutzer-Zugang erneuern'),fresh={...session,accessToken:requiredString(result.access_token,'erneuerten Systemnutzer-Zugang',8000),issuedAt:now()},verified=await verify(app,fresh);
   if(!verified.inspected.expiresAt)throw new ConnectorError('Meta hat keine befristete Erneuerung bestätigt. Bitte das eigene Systemnutzer-Token prüfen.');
   if(fresh.extra?.portfolioAccountId){if((await portfolioProfile(fresh)).id!==session.subject)throw new ConnectorError('Das erneuerte Profil gehört nicht zur gespeicherten Verbindung.','permission');}else{const assigned=await accounts(fresh);if(!assigned.some(row=>row.id===session.subject))throw new ConnectorError('Das Instagram-Profil ist diesem Systemnutzer nicht mehr zugewiesen.','permission');}
   return{...fresh,scopes:verified.inspected.scopes,expiresAt:verified.inspected.expiresAt,nonExpiring:false};
  }
 };
}
