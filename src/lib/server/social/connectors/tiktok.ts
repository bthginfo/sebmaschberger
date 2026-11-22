import {ConnectorError,checkedUploadUrl,expiresIn,providerFetch,requiredString,type ProviderClient,type ProviderContext,type ProviderFactoryOptions,type ProviderReceipt,type ProviderSession,type ProviderState} from './provider-contract';

const API='https://open.tiktokapis.com/v2/';
const SCOPES=['user.info.basic','video.upload'];
const now=(options:ProviderFactoryOptions)=>options.now?.()??new Date().toISOString();
const object=(value:unknown):value is Record<string,any>=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);

/** TikTok uses an error envelope even for successful responses. Never expose its raw message. */
async function json(response:Response,final=false):Promise<Record<string,any>>{
 let raw:string;try{raw=await response.text();}catch{throw new ConnectorError('Die TikTok-Antwort ist nicht bestaetigt.',final?'ambiguous':'transient');}
 let data:Record<string,any>;try{if(raw.length>1_000_000)throw new Error();const parsed=JSON.parse(raw);if(!object(parsed))throw new Error();data=parsed;}catch{throw new ConnectorError('Die TikTok-Antwort ist nicht eindeutig.',final?'ambiguous':'invalid');}
 const code=object(data.error)?data.error.code:data.error;
 if(!response.ok||(code&&code!=='ok')){
  const kind=final&&response.status>=500?'ambiguous':response.status===401||['access_token_invalid','invalid_grant','invalid_token'].includes(code)?'expired':response.status===403||code==='scope_not_authorized'?'permission':response.status===429||String(code).startsWith('spam_risk_')?'quota':response.status>=500?'transient':'invalid';
  throw new ConnectorError('TikTok hat die Anfrage nicht bestaetigt. Bitte Zugang, Berechtigungen und Video pruefen.',kind);
 }
 return data;
}

async function save(context:ProviderContext,state:ProviderState){await context.checkpoint(state);context.state=state;}
function media(context:ProviderContext){const value=context.media;if(context.post.kind!=='reel'||!value||value.mimeType!=='video/mp4'||!value.bytes.length||value.bytes.length>4*1024*1024||value.width<360||value.height<360||value.width>4096||value.height>4096)throw new ConnectorError('TikTok benoetigt ein eigenes vorbereitetes MP4-Video mit mindestens 360 Pixeln je Seite.');return value;}
function bound(context:ProviderContext){if(context.target.id!==context.session.subject)throw new ConnectorError('Der TikTok-Zugang gehoert zu einem anderen Konto.','configuration');if(context.state.tiktokTarget&&context.state.tiktokTarget!==context.target.id||context.state.tiktokMediaHash&&context.state.tiktokMediaHash!==media(context).sha256)throw new ConnectorError('Der TikTok-Upload gehoert zu einem anderen freigegebenen Stand.','configuration');}
function pullUrl(context:ProviderContext){
 let url:URL;try{url=new URL(context.mediaUrl??'');}catch{throw new ConnectorError('Die geschützte HTTPS-Medienadresse fehlt.','configuration');}
 if(url.protocol!=='https:'||url.username||url.password||url.hash||url.port&&url.port!=='443'||url.toString().length>2048)throw new ConnectorError('TikTok benötigt eine geschützte HTTPS-Medienadresse ohne Weiterleitung.','configuration');
 return url.toString();
}

export function createTiktokClient(options:ProviderFactoryOptions):ProviderClient{
 async function call(path:string,session:ProviderSession,body?:unknown,final=false){return json(await providerFetch(options,API+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+session.accessToken,...(body===undefined?{}:{'Content-Type':'application/json; charset=UTF-8'})},...(body===undefined?{}:{body:JSON.stringify(body)})},final),final);}
 function session(data:Record<string,any>,at:string,previous?:ProviderSession):ProviderSession{
  const scopes=requiredString(data.scope,'Berechtigungen',3000).split(',').map(value=>value.trim());if(SCOPES.some(scope=>!scopes.includes(scope)))throw new ConnectorError('Bitte TikTok-Profil und Video-Upload ausdruecklich erlauben.','permission');
  const subject=requiredString(data.open_id,'TikTok-Konto',256);if(previous&&subject!==previous.subject)throw new ConnectorError('TikTok hat ein anderes Konto bestaetigt.','configuration');
  const expiresAt=expiresIn(data.expires_in,at),refreshExpiresAt=expiresIn(data.refresh_expires_in,at);if(!expiresAt||!refreshExpiresAt)throw new ConnectorError('TikTok hat keine gueltige Zugangsdauer bestaetigt.','expired');
  return{accessToken:requiredString(data.access_token,'Zugang',8192),refreshToken:requiredString(data.refresh_token,'Erneuerung',8192),subject,scopes,expiresAt,refreshExpiresAt,issuedAt:at};
 }
 async function identity(input:{session:ProviderSession}){const result=await call('user/info/?fields=open_id,display_name',input.session);const user=result.data?.user;if(!object(user)||user.open_id!==input.session.subject)throw new ConnectorError('Das TikTok-Profil konnte nicht zum Zugang zugeordnet werden.','configuration');return{id:requiredString(user.open_id,'TikTok-Konto',256),label:typeof user.display_name==='string'&&user.display_name.trim()?user.display_name.slice(0,100):'TikTok',kind:'profile' as const};}
 async function status(context:ProviderContext):Promise<ProviderReceipt|null>{bound(context);if(!context.state.tiktokPublishId)return null;const id=requiredString(context.state.tiktokPublishId,'Upload-Kennung',64),result=await call('post/publish/status/fetch/',context.session,{publish_id:id});const state=result.data?.status;if(state==='SEND_TO_USER_INBOX'||state==='PUBLISH_COMPLETE')return{outcome:'handoff',id};if(state==='FAILED')throw new ConnectorError('TikTok konnte das Video nicht an die Inbox uebergeben. Bitte in TikTok pruefen.');if(!['PROCESSING_UPLOAD','PROCESSING_DOWNLOAD'].includes(state))throw new ConnectorError('Der TikTok-Uploadstatus ist noch nicht eindeutig.');return null;}
 return{
  id:'tiktok',pkce:false,
  authorization({app,redirectUri,state}){const url=new URL('https://www.tiktok.com/v2/auth/authorize/');url.search=new URLSearchParams({client_key:app.clientId,response_type:'code',scope:SCOPES.join(','),redirect_uri:redirectUri,state,disable_auto_auth:'1'}).toString();return url.toString();},
  async exchange({app,redirectUri,code}){const result=await json(await providerFetch(options,API+'oauth/token/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_key:app.clientId,client_secret:app.clientSecret,code,grant_type:'authorization_code',redirect_uri:redirectUri})}));return session(result,now(options));},
  async discover(input){return[{target:await identity(input),session:input.session}];},
  async check(input){const target=await identity(input);if(input.target.id!==target.id||input.target.kind!=='profile')throw new ConnectorError('Bitte das bestaetigte TikTok-Profil verwenden.','configuration');return target;},
  async refresh({app,session:previous}){if(!previous.refreshToken)throw new ConnectorError('Bitte TikTok erneut verbinden.','expired');const result=await json(await providerFetch(options,API+'oauth/token/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_key:app.clientId,client_secret:app.clientSecret,refresh_token:previous.refreshToken,grant_type:'refresh_token'})}));return session(result,now(options),previous);},
  validate(post,value){media({post,media:value} as ProviderContext);},
  // Server-held media must use PULL_FROM_URL. Initializing that transfer starts
  // the download, so it belongs to the final, scheduled step, never prewarming.
  async prepare(context){media(context);bound(context);if(context.state.tiktokPublishId&&context.state.tiktokTransfer!=='pull')checkedUploadUrl(context.state.tiktokUploadUrl,host=>host==='open-upload.tiktokapis.com'||host.endsWith('.tiktokapis.com'));else pullUrl(context);return{ready:true};},
  async poll(context){media(context);bound(context);return{ready:true};},
  async publish(context){const value=media(context);bound(context);
   if(!context.state.tiktokPublishId){
    if(context.state.tiktokInitAttempted)throw new ConnectorError('Die TikTok-Übergabe wurde bereits begonnen, aber nicht eindeutig bestätigt. Bitte in TikTok prüfen.','ambiguous');
    const url=pullUrl(context);
    await save(context,{...context.state,tiktokTransfer:'pull',tiktokInitAttempted:true,tiktokTarget:context.target.id,tiktokMediaHash:value.sha256});
    const result=await call('post/publish/inbox/video/init/',context.session,{source_info:{source:'PULL_FROM_URL',video_url:url}},true);
    let id:string;try{id=requiredString(result.data?.publish_id,'Upload-Kennung',64);}catch{throw new ConnectorError('TikTok hat keine eindeutige Upload-Kennung bestätigt. Bitte den bestehenden Versuch prüfen.','ambiguous');}
    await save(context,{...context.state,tiktokPublishId:id});
   }
   const id=requiredString(context.state.tiktokPublishId,'Upload-Kennung',64);
   if(context.state.tiktokTransfer==='pull'){
    try{return(await status(context))??{outcome:'pending',id};}catch(error){if(error instanceof ConnectorError&&error.kind==='transient')return{outcome:'pending',id};throw error;}
   }
   // Resume previously approved FILE_UPLOAD jobs without changing their IDs.
   if(context.state.tiktokUploadAttempted)return(await status(context))??{outcome:'pending',id};
   const url=checkedUploadUrl(context.state.tiktokUploadUrl,host=>host==='open-upload.tiktokapis.com'||host.endsWith('.tiktokapis.com'));
   await save(context,{...context.state,tiktokUploadAttempted:true});
   const response=await providerFetch(options,url,{method:'PUT',headers:{'Content-Type':'video/mp4','Content-Length':String(value.bytes.length),'Content-Range':`bytes 0-${value.bytes.length-1}/${value.bytes.length}`},body:new Uint8Array(value.bytes).buffer},true);
   if(response.status!==201)throw new ConnectorError('TikTok hat die Videouebergabe nicht eindeutig bestaetigt.',response.status>=500||response.ok?'ambiguous':response.status===403?'expired':'invalid');
   await save(context,{...context.state,tiktokUploadComplete:true});
   try{return(await status(context))??{outcome:'pending',id};}catch(error){if(error instanceof ConnectorError&&error.kind==='transient')return{outcome:'pending',id};throw error;}
  },
  reconcile:status
 };
}
