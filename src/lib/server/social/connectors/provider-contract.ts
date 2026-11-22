import type {ConnectorProvider,ConnectorTarget,ConnectorPostOptions} from '../../../social/connectors/model';

export type JsonValue=null|boolean|number|string|JsonValue[]|{[key:string]:JsonValue};
export type ProviderState={[key:string]:JsonValue};
export type ProviderApp={clientId:string;clientSecret:string;scopes?:string[];instagramLoginMode?:'unified'|'instagram';configurationId?:string};
export type ProviderSession={accessToken:string;refreshToken?:string;expiresAt:string|null;refreshExpiresAt?:string|null;nonExpiring?:boolean;scopes:string[];subject:string;issuedAt:string;extra?:Record<string,string>};
export type DiscoveredAccount={target:ConnectorTarget;session:ProviderSession};
export type ProviderMediaItem={bytes:Uint8Array;mimeType:'image/jpeg'|'video/mp4';width:number;height:number;durationMs?:number;sha256:string};
export type ProviderMedia=ProviderMediaItem & {items?:ProviderMediaItem[]};
export type ProviderPost={id:string;generation:number;kind:'text'|'image'|'reel';carousel?:true;carouselAltTexts?:string[];caption:string;altText:string;title:string;scheduledAt:string;providerOptions?:ConnectorPostOptions};
export type ProviderContext={app:ProviderApp;session:ProviderSession;target:ConnectorTarget;post:ProviderPost;media:ProviderMedia|null;mediaUrl:string|null;mediaUrls?:string[];now:string;key:string;state:ProviderState;checkpoint:(state:ProviderState)=>Promise<void>};
export type ProviderStep={ready:boolean;retryAfterMs?:number};
export type ProviderReceipt={outcome:'published'|'handoff'|'pending';id:string|null};
export class ConnectorError extends Error{constructor(message:string,public kind:'configuration'|'expired'|'permission'|'quota'|'transient'|'ambiguous'|'invalid'='invalid'){super(message);}}
export type ProviderClient={
 id:ConnectorProvider;pkce:boolean;
 authorization?:(input:{app:ProviderApp;redirectUri:string;state:string;challenge:string})=>string;
 exchange?:(input:{app:ProviderApp;redirectUri:string;code:string;verifier:string})=>Promise<ProviderSession>;
 login?:(input:{identifier:string;appPassword:string})=>Promise<ProviderSession>;
 importPortfolioAccess?:(input:{app:ProviderApp;accessToken:string;accountId?:string})=>Promise<ProviderSession>;
 discover:(input:{app:ProviderApp;session:ProviderSession})=>Promise<DiscoveredAccount[]>;
 check:(input:{app:ProviderApp;session:ProviderSession;target:ConnectorTarget})=>Promise<ConnectorTarget>;
 refresh?:(input:{app:ProviderApp;session:ProviderSession})=>Promise<ProviderSession>;
 validate:(post:ProviderPost,media:ProviderMedia|null)=>void;
 prepare:(context:ProviderContext)=>Promise<ProviderStep>;
 poll:(context:ProviderContext)=>Promise<ProviderStep>;
 publish:(context:ProviderContext)=>Promise<ProviderReceipt>;
 reconcile:(context:ProviderContext)=>Promise<ProviderReceipt|null>;
};
export type ProviderFactoryOptions={fetch:typeof fetch;now?:()=>string;timeoutMs?:number};

/** Returned capability URLs are credentials: strict HTTPS host checks, never redirects or raw error bodies. */
export function checkedUploadUrl(value:unknown,allowed:(host:string)=>boolean){if(typeof value!=='string'||value.length>8192)throw new ConnectorError('Der Anbieter hat keine gültige Upload-Adresse bestätigt.');let url:URL;try{url=new URL(value);}catch{throw new ConnectorError('Die Upload-Adresse des Anbieters ist ungültig.');}if(url.protocol!=='https:'||url.username||url.password||url.port&&!['443'].includes(url.port)||!allowed(url.hostname.toLowerCase()))throw new ConnectorError('Die Upload-Adresse gehört nicht zum erwarteten Anbieter.');return url.toString();}
export function requiredString(value:unknown,label='Kennung',max=512){if(typeof value!=='string'||!value||value.length>max||/[\u0000-\u001f\u007f]/.test(value))throw new ConnectorError('Der Anbieter hat keine gültige '+label+' bestätigt.');return value;}
export const bearer=(session:ProviderSession)=>({Authorization:'Bearer '+session.accessToken});
export const expiresIn=(seconds:unknown,at:string)=>typeof seconds==='number'&&Number.isFinite(seconds)&&seconds>0?new Date(Date.parse(at)+seconds*1000).toISOString():null;
export async function providerJson(response:Response,phase='Anfrage',final=false):Promise<Record<string,any>>{let raw:string;try{raw=await response.text();}catch{throw new ConnectorError('Die Antwort des Anbieters konnte nicht bestätigt werden.',final?'ambiguous':'transient');}if(raw.length>2_000_000)throw new ConnectorError('Die Antwort des Anbieters ist zu groß.',final?'ambiguous':'invalid');let data:Record<string,any>;try{data=raw?JSON.parse(raw):{};}catch{throw new ConnectorError('Die Antwort des Anbieters ist nicht eindeutig.',final?'ambiguous':'invalid');}if(!data||typeof data!=='object'||Array.isArray(data))throw new ConnectorError('Die Antwort des Anbieters ist nicht eindeutig.',final?'ambiguous':'invalid');if(!response.ok||data.error){const kind=final&&response.status>=500?'ambiguous':response.status===401?'expired':response.status===403?'permission':response.status===429?'quota':response.status>=500?'transient':'invalid';throw new ConnectorError(phase+' wurde vom Anbieter nicht bestätigt. Bitte Verbindung, Berechtigungen und Inhalt prüfen.',kind);}return data;}
export async function providerFetch(options:ProviderFactoryOptions,url:string,init:RequestInit={},final=false){try{return await options.fetch(url,{...init,redirect:'error',cache:'no-store',signal:init.signal??AbortSignal.timeout(options.timeoutMs??30000)});}catch{throw new ConnectorError(final?'Die Übergabe ist nicht eindeutig bestätigt. Bitte den Anbieterstatus prüfen; es wird nichts erneut gesendet.':'Der Anbieter ist gerade nicht erreichbar. Der gespeicherte Stand bleibt erhalten.',final?'ambiguous':'transient');}}
