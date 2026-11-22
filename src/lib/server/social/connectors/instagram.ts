import {createInstagramDriver,InstagramError} from '../publishing/instagram';
import {ConnectorError,expiresIn,providerFetch,providerJson,requiredString,type ProviderClient,type ProviderContext,type ProviderFactoryOptions,type ProviderMedia,type ProviderPost,type ProviderSession} from './provider-contract';

import {createInstagramUnifiedClient} from './instagram-unified';

const SCOPES=['instagram_business_basic','instagram_business_content_publish'];
const identifier=(value:unknown)=>{const id=String(value??'');if(!/^\d{5,40}$/.test(id))throw new ConnectorError('Instagram hat keine gültige Kontokennung bestätigt.');return id;};
function validate(post:ProviderPost,media:ProviderMedia|null){
 if(post.carousel){
  const items=media?.items;if(post.kind!=='image'||!items||items.length<2||items.length>20||post.carouselAltTexts&&post.carouselAltTexts.length!==items.length)throw new ConnectorError('Ein Instagram-Carousel braucht 2 bis 20 geprüfte Bilddateien.');
  for(const item of items){validate({...post,carousel:undefined,carouselAltTexts:undefined},item);if(item.mimeType!=='image/jpeg'||item.width!==items[0].width||item.height!==items[0].height)throw new ConnectorError('Alle Carousel-Folien benötigen dasselbe Bildformat.');}
  return;
 }
 if(!['image','reel'].includes(post.kind)||!media||media.bytes.length<1||media.bytes.length>4*1024*1024)throw new ConnectorError('Instagram benötigt hier ein eigenes geprüftes JPEG oder MP4 bis 4 MB.');
 if(post.caption.length>2200||post.altText.length>1000)throw new ConnectorError('Bitte Caption und Bildbeschreibung kürzen.');
 if(post.kind==='image'&&(media.mimeType!=='image/jpeg'||media.width<320||media.width>1440||media.width/media.height<.8||media.width/media.height>1.91))throw new ConnectorError('Instagram-Bilder benötigen ein JPEG mit 320 bis 1.440 Pixeln Breite und einem Verhältnis von 4:5 bis 1,91:1.');
 if(post.kind==='reel'&&(media.mimeType!=='video/mp4'||!media.durationMs||media.durationMs<3000||media.durationMs>90000||media.width<540||media.height<960||Math.abs(media.width/media.height-9/16)>.015))throw new ConnectorError('Instagram-Reels benötigen hier ein MP4 in 9:16, mindestens 540 × 960 Pixel und 3 bis 90 Sekunden.');
}

function createInstagramLegacyClient(options:ProviderFactoryOptions):ProviderClient{
 const now=()=>options.now?.()??new Date().toISOString(),driver=createInstagramDriver({fetch:options.fetch,timeoutMs:options.timeoutMs});
 async function guarded<T>(work:()=>Promise<T>):Promise<T>{try{return await work();}catch(error){if(error instanceof InstagramError)throw new ConnectorError(error.message,error.kind);throw error;}}
 const credentials=(session:ProviderSession)=>({accountId:identifier(session.subject),accessToken:session.accessToken,loginMode:session.extra?.instagramLoginMode==='unified'?'unified' as const:'instagram' as const});
 async function profile(session:ProviderSession){
  if(SCOPES.some(scope=>!session.scopes.includes(scope)))throw new ConnectorError('Bitte beide Instagram-Rechte für Profil und Veröffentlichung freigeben.','permission');
  const result=await guarded(()=>driver.checkAccount(credentials(session)));
  if(!result.username)throw new ConnectorError('Instagram hat keinen Profilnamen bestätigt.');
  return{id:result.id,label:'@'+result.username,username:result.username,kind:'profile' as const,profileUrl:'https://www.instagram.com/'+encodeURIComponent(result.username)+'/'};
 }
 const save=async(context:ProviderContext,patch:Record<string,import('./provider-contract').JsonValue>)=>context.checkpoint({...context.state,...patch});
 async function carouselStep(context:ProviderContext){
  const urls=context.mediaUrls,items=context.media?.items;if(!urls||!items||urls.length!==items.length)throw new ConnectorError('Die freigegebenen Carousel-Bilder fehlen.');
  const raw=context.state.instagramCarouselChildren,children=Array.isArray(raw)?raw.map(identifier):[];if(children.length>items.length)throw new ConnectorError('Der gespeicherte Carousel-Auftrag stimmt nicht mehr überein.');
  if(children.length<items.length){const index=children.length,id=await guarded(()=>driver.createImage(credentials(context.session),{url:urls[index],caption:'',altText:context.post.carouselAltTexts?.[index]??context.post.altText,carouselItem:true}));await save(context,{instagramCarouselChildren:[...children,id]});return{ready:false,retryAfterMs:1000};}
  const states=await Promise.all(children.map(id=>guarded(()=>driver.status(credentials(context.session),id))));
  if(states.some(state=>['ERROR','EXPIRED','PUBLISHED'].includes(state)))throw new ConnectorError('Instagram konnte eine Carousel-Folie nicht eindeutig vorbereiten. Bitte den Anbieterstatus prüfen.');
  if(states.some(state=>state!=='FINISHED'))return{ready:false,retryAfterMs:60000};
  const id=await guarded(()=>driver.createCarousel(credentials(context.session),{children,caption:context.post.caption}));await save(context,{instagramContainerId:id});return{ready:false,retryAfterMs:1000};
 }
 return{
  id:'instagram',pkce:false,
  authorization(input){const url=new URL('https://www.instagram.com/oauth/authorize');for(const[key,value]of Object.entries({client_id:input.app.clientId,redirect_uri:input.redirectUri,response_type:'code',state:input.state,scope:SCOPES.join(','),enable_fb_login:'0',force_authentication:'1'}))url.searchParams.set(key,value);return url.toString();},
  async exchange(input){
   const body=new URLSearchParams({client_id:input.app.clientId,client_secret:input.app.clientSecret,grant_type:'authorization_code',redirect_uri:input.redirectUri,code:input.code});
   const short=await providerJson(await providerFetch(options,'https://api.instagram.com/oauth/access_token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body.toString()}),'Instagram-Anmeldung');
   const subject=identifier(short.user_id),scopes=Array.isArray(short.permissions)?short.permissions.filter((value:unknown):value is string=>typeof value==='string'):[];
   if(SCOPES.some(scope=>!scopes.includes(scope)))throw new ConnectorError('Instagram hat die benötigten Profil- und Veröffentlichungsrechte nicht bestätigt. Bitte die App-Rechte prüfen und erneut anmelden.','permission');
   const url=new URL('https://graph.instagram.com/access_token');url.searchParams.set('grant_type','ig_exchange_token');url.searchParams.set('client_secret',input.app.clientSecret);url.searchParams.set('access_token',requiredString(short.access_token,'Instagram-Zugang',8000));
   const long=await providerJson(await providerFetch(options,url.toString()),'Langlebiger Instagram-Zugang'),at=now(),expiresAt=expiresIn(long.expires_in,at);
   if(!expiresAt)throw new ConnectorError('Instagram hat keine gültige Zugangsdauer bestätigt.');
   const session:ProviderSession={accessToken:requiredString(long.access_token,'Instagram-Zugang',8000),subject,expiresAt,issuedAt:at,scopes};await profile(session);return session;
  },
  async discover({session}){return[{target:await profile(session),session}];},
  async check({session,target}){if(target.kind!=='profile'||identifier(target.id)!==session.subject)throw new ConnectorError('Dieses Profil gehört nicht zum autorisierten Instagram-Zugang.','permission');return profile(session);},
  async refresh({session}){if(!session.expiresAt||Date.parse(session.expiresAt)<=Date.parse(now()))throw new ConnectorError('Der Instagram-Zugang ist abgelaufen. Bitte erneut anmelden.','expired');if(Date.parse(session.issuedAt)>Date.parse(now())-86400000)throw new ConnectorError('Instagram erlaubt die Verlängerung frühestens nach 24 Stunden.','configuration');const refreshed=await guarded(()=>driver.refresh(session.accessToken)),at=now(),expiresAt=expiresIn(refreshed.expiresIn,at);if(!expiresAt)throw new ConnectorError('Instagram hat keine gültige Zugangsdauer bestätigt.');const next={...session,accessToken:refreshed.accessToken,issuedAt:at,expiresAt};await profile(next);return next;},
  validate,
  async prepare(context){validate(context.post,context.media);if(context.target.kind!=='profile'||context.target.id!==context.session.subject)throw new ConnectorError('Bitte das autorisierte Instagram-Profil verwenden.','permission');if(context.state.instagramContainerId)return{ready:false,retryAfterMs:60000};if(!context.mediaUrl)throw new ConnectorError('Die freigegebene HTTPS-Mediendatei fehlt.');const quota=await guarded(()=>driver.quota(credentials(context.session)));if(quota.total!==null&&quota.usage>=quota.total)throw new ConnectorError('Das Instagram-Veröffentlichungslimit ist erreicht.','quota');if(context.post.carousel)return carouselStep(context);const id=await guarded(()=>context.post.kind==='image'?driver.createImage(credentials(context.session),{url:context.mediaUrl!,caption:context.post.caption,altText:context.post.altText}):driver.createReel(credentials(context.session),{url:context.mediaUrl!,caption:context.post.caption}));await save(context,{instagramContainerId:id});return{ready:false,retryAfterMs:60000};},
  async poll(context){validate(context.post,context.media);if(context.post.carousel&&!context.state.instagramContainerId)return carouselStep(context);const status=await guarded(()=>driver.status(credentials(context.session),identifier(context.state.instagramContainerId)));if(status==='ERROR'||status==='EXPIRED')throw new ConnectorError('Instagram konnte die vorbereiteten Medien nicht verarbeiten.');if(status==='PUBLISHED')throw new ConnectorError('Instagram meldet den Container bereits als veröffentlicht. Bitte den Status prüfen.','ambiguous');if(status==='FINISHED')await save(context,{instagramReady:true});return{ready:status==='FINISHED',retryAfterMs:60000};},
  async publish(context){validate(context.post,context.media);if(context.state.instagramReady!==true)throw new ConnectorError('Die Instagram-Medien sind noch nicht bereit.');const id=await guarded(()=>driver.publish(credentials(context.session),identifier(context.state.instagramContainerId)));await save(context,{instagramMediaId:id});return{outcome:'published',id};},
  async reconcile(context){if(!context.state.instagramContainerId)return null;const status=await guarded(()=>driver.status(credentials(context.session),identifier(context.state.instagramContainerId)));return status==='PUBLISHED'?{outcome:'published',id:typeof context.state.instagramMediaId==='string'?context.state.instagramMediaId:null}:null;}
 };
}

/** Saved legacy records retain their original login; new apps explicitly select Unified Login. */
export function createInstagramClient(options:ProviderFactoryOptions):ProviderClient{
 const legacy=createInstagramLegacyClient(options),unified=createInstagramUnifiedClient(options,legacy);
 const selected=(app:import('./provider-contract').ProviderApp,session?:ProviderSession)=>{const mode=app.instagramLoginMode==='unified'?'unified':'instagram';if(session&&((session.extra?.instagramLoginMode==='unified')!==(mode==='unified')))throw new ConnectorError('Die gespeicherte Instagram-Anmeldung hat sich geändert. Bitte erneut verbinden.','permission');return mode==='unified'?unified:legacy;};
 return{...legacy,importPortfolioAccess:input=>unified.importPortfolioAccess!(input),authorization:input=>selected(input.app).authorization!(input),exchange:async input=>selected(input.app).exchange!(input),discover:async input=>selected(input.app,input.session).discover(input),check:async input=>selected(input.app,input.session).check(input),refresh:async input=>selected(input.app,input.session).refresh!(input),prepare:async input=>selected(input.app,input.session).prepare(input),poll:async input=>selected(input.app,input.session).poll(input),publish:async input=>selected(input.app,input.session).publish(input),reconcile:async input=>selected(input.app,input.session).reconcile(input)};
}
