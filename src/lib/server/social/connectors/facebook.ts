import type {ConnectorTarget} from '../../../social/connectors/model';
import {ConnectorError,checkedUploadUrl,expiresIn,providerFetch,requiredString,type ProviderClient,type ProviderContext,type ProviderFactoryOptions,type ProviderPost,type ProviderMedia,type ProviderSession,type ProviderState} from './provider-contract';

const GRAPH='https://graph.facebook.com/v26.0/',SCOPES=['pages_show_list','pages_read_engagement','pages_manage_posts'];
const id=(value:unknown)=>{const result=requiredString(value,'Facebook-Kennung',40);if(!/^\d+$/.test(result))throw new ConnectorError('Facebook hat keine gültige Kennung bestätigt.');return result;};
const pageId=(target:ConnectorTarget)=>{if(target.kind!=='page')throw new ConnectorError('Bitte eine geprüfte Facebook-Seite auswählen.','configuration');return id(target.id);};
const contentTask=(tasks:unknown)=>Array.isArray(tasks)&&tasks.some(task=>task==='CREATE_CONTENT'||task==='PROFILE_PLUS_CREATE_CONTENT');
const uploadUrl=(value:unknown)=>checkedUploadUrl(value,host=>host==='rupload.facebook.com');
function validate(post:ProviderPost,media:ProviderMedia|null){
 if(typeof post.caption!=='string'||post.caption.length>63206||typeof post.altText!=='string'||post.altText.length>1000)throw new ConnectorError('Text oder Bildbeschreibung ist für Facebook zu lang.');
 if(post.providerOptions?.link){let link:URL;try{link=new URL(post.providerOptions.link);}catch{throw new ConnectorError('Der Facebook-Ziellink ist ungültig.');}if(link.protocol!=='https:'||link.username||link.password||post.providerOptions.link.length>2048)throw new ConnectorError('Facebook benötigt einen gültigen HTTPS-Ziellink.');}
 if(post.kind==='text'){if(!post.caption.trim()&&!post.providerOptions?.link)throw new ConnectorError('Bitte einen Text oder einen Link für Facebook ergänzen.');if(media)throw new ConnectorError('Ein Textbeitrag darf keine Mediendatei enthalten.');return;}
 if(!media||!(media.bytes instanceof Uint8Array)||!media.bytes.length||media.bytes.length>4*1024*1024||!Number.isInteger(media.width)||!Number.isInteger(media.height)||media.width<1||media.height<1||media.width>4096||media.height>4096)throw new ConnectorError('Die geprüfte Facebook-Mediendatei fehlt oder ist zu groß.');
 if(post.kind==='image'&&media.mimeType!=='image/jpeg')throw new ConnectorError('Facebook-Bilder müssen als JPEG vorbereitet sein.');
 if(post.kind==='reel'&&(media.mimeType!=='video/mp4'||!media.durationMs||media.durationMs<3000||media.durationMs>90000||media.width<540||media.height<960||Math.abs(media.width/media.height-9/16)>0.015))throw new ConnectorError('Facebook-Reels brauchen ein MP4 im Hochformat 9:16 mit mindestens 540 × 960 Pixeln und 3 bis 90 Sekunden.');
 if(!['image','reel'].includes(post.kind))throw new ConnectorError('Dieses Facebook-Format wird nicht unterstützt.');
}
export function createFacebookClient(options:ProviderFactoryOptions):ProviderClient{
 const now=()=>options.now?.()??new Date().toISOString();
 async function graph(path:string,token:string,method='GET',fields:Record<string,string>={},final=false){
  const url=new URL(GRAPH+path),headers:Record<string,string>=token?{Authorization:'Bearer '+token}:{};let body:string|undefined;
  if(method==='GET')for(const[key,value]of Object.entries(fields))url.searchParams.set(key,value);else{headers['Content-Type']='application/json';body=JSON.stringify(fields);}
  return read(await providerFetch(options,url.toString(),{method,headers,body},final),final);
 }
 async function read(response:Response,final=false):Promise<Record<string,any>>{
  let data:any;try{const raw=await response.text();if(raw.length>2_000_000)throw new Error();data=JSON.parse(raw);}catch{throw new ConnectorError('Die Facebook-Antwort ist nicht eindeutig.',final?'ambiguous':'invalid');}
  if(!data||typeof data!=='object'||Array.isArray(data))throw new ConnectorError('Facebook hat keine gültige Antwort bestätigt.',final?'ambiguous':'invalid');
  if(!response.ok||data.error){const code=data.error?.code;throw new ConnectorError('Facebook hat die Anfrage nicht bestätigt. Bitte Verbindung, Berechtigungen und Inhalt prüfen.',code===190||response.status===401?'expired':code===10||code===200||response.status===403?'permission':response.status===429||[4,17,32,613].includes(code)?'quota':response.status>=500?(final?'ambiguous':'transient'):'invalid');}return data;
 }
 async function inspect(app:{clientId:string;clientSecret:string},session:ProviderSession){
  const result=await graph('debug_token',app.clientId+'|'+app.clientSecret,'GET',{input_token:session.accessToken}),data=result.data;
  if(!data||data.is_valid!==true)throw new ConnectorError('Der Facebook-Zugang ist nicht mehr gültig.','expired');
  if(String(data.app_id)!==app.clientId)throw new ConnectorError('Der Facebook-Zugang gehört zu einer anderen App.','configuration');
  if(!Array.isArray(data.scopes)||SCOPES.some(scope=>!data.scopes.includes(scope)))throw new ConnectorError('Die Facebook-Veröffentlichungsrechte fehlen.','permission');
  if([data.expires_at,data.data_access_expires_at].some(value=>typeof value==='number'&&value>0&&value*1000<=Date.parse(now())+30000))throw new ConnectorError('Der Facebook-Zugang ist abgelaufen. Bitte erneut verbinden.','expired');
  return data;
 }
 async function reelStatus(context:ProviderContext){const videoId=id(context.state.facebookVideoId),data=await graph(videoId,context.session.accessToken,'GET',{fields:'status'});if(data.id!==undefined&&data.id!==videoId)throw new ConnectorError('Facebook hat einen anderen Videostatus zurückgegeben.');return data;}
 function published(data:Record<string,any>){return data.status?.publishing_phase?.publish_status==='published';}
 async function save(context:ProviderContext,patch:ProviderState){await context.checkpoint({...context.state,...patch});}
 return{
  id:'facebook',pkce:false,
  authorization(input){const url=new URL('https://www.facebook.com/v26.0/dialog/oauth');for(const[key,value]of Object.entries({client_id:input.app.clientId,redirect_uri:input.redirectUri,state:input.state,response_type:'code',scope:SCOPES.join(',')}))url.searchParams.set(key,value);return url.toString();},
  async exchange(input){
   const short=await graph('oauth/access_token','', 'GET',{client_id:input.app.clientId,client_secret:input.app.clientSecret,redirect_uri:input.redirectUri,code:input.code});
   const long=await graph('oauth/access_token','','GET',{grant_type:'fb_exchange_token',client_id:input.app.clientId,client_secret:input.app.clientSecret,fb_exchange_token:requiredString(short.access_token,'Zugang',8000)});
   const at=now(),accessToken=requiredString(long.access_token,'Zugang',8000),expiresAt=expiresIn(long.expires_in,at);if(!expiresAt)throw new ConnectorError('Facebook hat keine gültige Zugangsdauer bestätigt.');
   const provisional:ProviderSession={accessToken,expiresAt,scopes:[],subject:'',issuedAt:at,extra:{facebookLongLived:'true'}};
   const checked=await inspect(input.app,provisional),profile=await graph('me',accessToken,'GET',{fields:'id,name'});return{...provisional,subject:id(profile.id),scopes:checked.scopes};
  },
  async discover({app,session}){
   const inspected=await inspect(app,session);if(id(inspected.user_id)!==session.subject)throw new ConnectorError('Der Facebook-Zugang gehört zu einem anderen Konto.','configuration');
   const accounts:Awaited<ReturnType<ProviderClient['discover']>>=[];let after:string|undefined;
   for(let page=0;page<20;page++){
    const result=await graph('me/accounts',session.accessToken,'GET',{fields:'id,name,access_token,tasks',limit:'100',...(after?{after}:{})});if(!Array.isArray(result.data))throw new ConnectorError('Facebook hat keine gültige Seitenliste bestätigt.');
    for(const row of result.data){if(!row||typeof row!=='object'||!contentTask(row.tasks))continue;const targetId=id(row.id),label=requiredString(row.name,'Seitennamen',300),pageAccess=requiredString(row.access_token,'Seitenzugang',8000),checked=await inspect(app,{...session,accessToken:pageAccess,subject:targetId});if(checked.expires_at!==0&&!(typeof checked.expires_at==='number'&&checked.expires_at>0))throw new ConnectorError('Facebook hat keine gültige Laufzeit für den Seitenzugang bestätigt.');const limits=[checked.expires_at,checked.data_access_expires_at].filter((value):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>0),expiresAt=limits.length?new Date(Math.min(...limits)*1000).toISOString():null,nonExpiring=expiresAt===null&&checked.expires_at===0;accounts.push({target:{id:targetId,label,kind:'page',profileUrl:'https://www.facebook.com/'+targetId},session:{accessToken:pageAccess,expiresAt,nonExpiring,scopes:checked.scopes,subject:targetId,issuedAt:now()}});}
    const next=result.paging?.cursors?.after;if(!result.paging?.next)break;if(typeof next!=='string'||!next||next===after||page===19)throw new ConnectorError('Die Facebook-Seitenliste ist nicht vollständig prüfbar.');after=next;
   }return accounts;
  },
  async check({app,session,target}){
   const targetId=pageId(target);if(session.subject!==targetId)throw new ConnectorError('Der Facebook-Zugang gehört zu einer anderen Seite.','configuration');
   await inspect(app,session);const profile=await graph('me',session.accessToken,'GET',{fields:'id,name,can_post'});if(id(profile.id)!==targetId)throw new ConnectorError('Facebook hat eine andere Seite bestätigt.','configuration');if(profile.can_post!==true)throw new ConnectorError('Für diese Facebook-Seite fehlt das Veröffentlichungsrecht.','permission');return{id:targetId,label:requiredString(profile.name,'Seitennamen',300),kind:'page',profileUrl:'https://www.facebook.com/'+targetId};
  },
  validate,
  async prepare(context){validate(context.post,context.media);if(pageId(context.target)!==context.session.subject)throw new ConnectorError('Der Facebook-Zugang gehört zu einer anderen Seite.','configuration');if(context.post.kind!=='reel')return{ready:true};
   if(!context.state.facebookVideoId){const created=await graph(pageId(context.target)+'/video_reels',context.session.accessToken,'POST',{upload_phase:'start'});await save(context,{facebookVideoId:id(created.video_id),facebookUploadUrl:uploadUrl(created.upload_url)});}
   if(context.state.facebookUploaded!==true){const response=await providerFetch(options,uploadUrl(context.state.facebookUploadUrl),{method:'POST',headers:{Authorization:'OAuth '+context.session.accessToken,offset:'0',file_size:String(context.media!.bytes.length),'Content-Type':'application/octet-stream'},body:context.media!.bytes as BodyInit});const uploaded=await read(response);if(uploaded.success!==true)throw new ConnectorError('Facebook hat den Video-Upload nicht bestätigt.');await save(context,{facebookUploaded:true});}
   return{ready:false,retryAfterMs:60000};
  },
  async poll(context){validate(context.post,context.media);if(context.post.kind!=='reel')return{ready:true};const data=await reelStatus(context),status=data.status;if(!status||typeof status.video_status!=='string')throw new ConnectorError('Facebook hat keinen gültigen Videostatus bestätigt.');if(['error','expired','upload_failed'].includes(status.video_status)||status.processing_phase?.status==='error'||status.publishing_phase?.status==='error')throw new ConnectorError('Facebook konnte das Video nicht verarbeiten.');const ready=status.video_status==='ready';if(ready)await save(context,{facebookReady:true});return{ready,retryAfterMs:60000};},
  async publish(context){validate(context.post,context.media);const target=pageId(context.target);if(target!==context.session.subject)throw new ConnectorError('Der Facebook-Zugang gehört zu einer anderen Seite.','configuration');
   if(context.post.kind==='reel'){if(context.state.facebookReady!==true)throw new ConnectorError('Das Facebook-Video ist noch nicht bereit.','configuration');const videoId=id(context.state.facebookVideoId),result=await graph(target+'/video_reels',context.session.accessToken,'POST',{upload_phase:'finish',video_id:videoId,video_state:'PUBLISHED',description:context.post.caption},true);if(result.success!==true)throw new ConnectorError('Die Facebook-Veröffentlichung ist nicht eindeutig bestätigt.','ambiguous');await save(context,{facebookPublishAccepted:true});try{const status=await reelStatus(context);if(published(status))return{outcome:'published',id:videoId};}catch{/* The acknowledged final request must remain read-only pending. */}return{outcome:'pending',id:videoId};}
   let data:Record<string,any>;
   if(context.post.kind==='image'){const form=new FormData();form.set('source',new Blob([new Uint8Array(context.media!.bytes)],{type:'image/jpeg'}),'image.jpg');form.set('caption',context.post.caption);form.set('alt_text_custom',context.post.altText);form.set('published','true');data=await read(await providerFetch(options,GRAPH+target+'/photos',{method:'POST',headers:{Authorization:'Bearer '+context.session.accessToken},body:form},true),true);}else data=await graph(target+'/feed',context.session.accessToken,'POST',{message:context.post.caption,published:'true',...(context.post.providerOptions?.link?{link:context.post.providerOptions.link}:{})},true);
   const receipt=context.post.kind==='image'?data.post_id:data.id;if(typeof receipt!=='string'||!/^\d+(?:_\d+)?$/.test(receipt))throw new ConnectorError('Die Facebook-Veröffentlichung ist nicht eindeutig bestätigt.','ambiguous');await save(context,{facebookPostId:receipt});return{outcome:'published',id:receipt};
  },
  async reconcile(context){if(context.state.facebookVideoId){const data=await reelStatus(context);return published(data)?{outcome:'published',id:id(context.state.facebookVideoId)}:null;}if(typeof context.state.facebookPostId!=='string')return null;const data=await graph(context.state.facebookPostId,context.session.accessToken,'GET',{fields:'id,is_published'});return data.id===context.state.facebookPostId&&data.is_published===true?{outcome:'published',id:data.id}:null;}
 };
}
