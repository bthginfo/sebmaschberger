import {safeAnalyticsPath,sourceHostname,type AnalyticsPublic} from './model';
import {consentChangedEvent,readConsent,storageKey} from './consent-state';
type StoredVisitor={id:string;expires:number};
const visitorKey='cms-statistics-visitor-v1',sessionKey='cms-statistics-session-v1',attributionKey='cms-statistics-attribution-v1';
/** No network, identifiers or storage access until start() is called after explicit consent. */
export function startFirstPartyAnalytics(config:AnalyticsPublic):()=>void{
 if(!config.enabled||!safeAnalyticsPath(location.pathname))return()=>{};
 let stopped=false,abort=new AbortController(),token='',expires=0,pageId=crypto.randomUUID(),currentPath=safeAnalyticsPath(location.pathname),engagedMs=0,lastTick=Date.now(),lastActivity=Date.now();
 let visitor:StoredVisitor,session:{id:string;lastActive:number;createdAt:number};
 try{const stored=JSON.parse(localStorage.getItem(visitorKey)||'null');visitor=stored?.expires>Date.now()&&typeof stored.id==='string'?stored:{id:crypto.randomUUID(),expires:Date.now()+365*86400000};localStorage.setItem(visitorKey,JSON.stringify(visitor));const previous=JSON.parse(sessionStorage.getItem(sessionKey)||'null');session=previous?.lastActive>Date.now()-30*60000&&previous.createdAt>Date.now()-86400000?previous:{id:crypto.randomUUID(),lastActive:Date.now(),createdAt:Date.now()};sessionStorage.setItem(sessionKey,JSON.stringify(session));}catch{return()=>{};}
 const initial=new URL(location.href),source=initial.searchParams.get('utm_source')||sourceHostname(document.referrer,location.hostname),campaign=initial.searchParams.get('utm_campaign')||'',medium=initial.searchParams.get('utm_medium')||'';
 let queue:Promise<void>=Promise.resolve();
 async function send(snapshot:{pageId:string;path:string;engagedMs:number;source:string;campaign:string;medium:string;goal?:string}){
  if(stopped)return;
  try{
   if(Date.now()-lastActivity>30*60000||Date.now()-session.createdAt>=86400000){session={id:crypto.randomUUID(),lastActive:Date.now(),createdAt:Date.now()};token='';pageId=crypto.randomUUID();snapshot.pageId=pageId;engagedMs=0;snapshot.engagedMs=0;}
   if(!token||expires<Date.now()+60000){const response=await fetch('/api/analytics/consent',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({visitor:visitor.id,session:session.id,generation:config.generation,policy:'first-party-v1'}),signal:abort.signal,credentials:'same-origin',cache:'no-store'});if(!response.ok){if(response.status===401||response.status===409){stop();clearFirstPartyAnalytics();}return;}const result=await response.json();if(stopped)return;token=result.token;expires=Date.parse(result.expiresAt);}
   if(stopped)return;const sent=await fetch('/api/analytics/event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...snapshot,token}),signal:abort.signal,credentials:'same-origin',cache:'no-store',keepalive:true});
   if(!sent.ok){if(sent.status===401||sent.status===409){stop();clearFirstPartyAnalytics();}return;}
   if(stopped)return;lastActivity=Date.now();session.lastActive=lastActivity;sessionStorage.setItem(sessionKey,JSON.stringify(session));
   sessionStorage.setItem(attributionKey,JSON.stringify({generation:config.generation,session:session.id,pageId:snapshot.pageId,at:lastActivity}));
  }catch{/* Tracking failure never interrupts the website. */}
 }
 const enqueue=()=>{if(stopped||!currentPath)return;const snapshot={pageId,path:currentPath,engagedMs,source,campaign,medium,goal:config.goals.find(g=>g.path===currentPath)?.id};queue=queue.then(()=>send(snapshot),()=>send(snapshot));};
 function tick(){const at=Date.now(),elapsed=Math.min(at-lastTick,16000);lastTick=at;if(document.visibilityState==='visible'&&document.hasFocus())engagedMs=Math.min(1800000,engagedMs+elapsed);const next=safeAnalyticsPath(location.pathname);if(next!==currentPath){enqueue();currentPath=next;pageId=crypto.randomUUID();engagedMs=0;}if(document.visibilityState==='visible')enqueue();}
 const interval=setInterval(tick,15000),routeInterval=setInterval(()=>{if(safeAnalyticsPath(location.pathname)!==currentPath)tick();},500);
 const visibility=()=>{if(document.visibilityState==='hidden'){tick();enqueue();}else lastTick=Date.now();};
 document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',enqueue);enqueue();
 const stop=()=>{stopped=true;abort.abort();clearInterval(interval);clearInterval(routeInterval);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',enqueue);token='';};return stop;
}
export function clearFirstPartyAnalytics(){try{localStorage.removeItem(visitorKey);sessionStorage.removeItem(sessionKey);sessionStorage.removeItem(attributionKey);}catch{/* Restricted storage. */}}

export async function reportConfirmedOutcome(proof?:string) {
 if(!proof)return;
 const consent=readConsent();
 if(consent?.analytics!==true||!Number.isInteger(consent.statisticsGeneration))return;
 const abort=new AbortController();
 const stop=()=>abort.abort();
 const storage=(event:StorageEvent)=>{if(event.key===storageKey)stop();};
 window.addEventListener(consentChangedEvent,stop);
 window.addEventListener('storage',storage);
 try {
  const attributed=JSON.parse(sessionStorage.getItem(attributionKey)||'null');
  const visitor=JSON.parse(localStorage.getItem(visitorKey)||'null');
  if(!attributed||attributed.generation!==consent.statisticsGeneration||attributed.at<Date.now()-30*60000||!(visitor?.expires>Date.now()))return;
  const options={method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin' as const,signal:abort.signal,cache:'no-store' as const};
  const response=await fetch('/api/analytics/consent',{...options,body:JSON.stringify({
   visitor:visitor.id,session:attributed.session,generation:consent.statisticsGeneration,policy:'first-party-v1'
  })});
  if(!response.ok||abort.signal.aborted||readConsent()?.analytics!==true)return;
  const {token}=await response.json();
  await fetch('/api/analytics/outcome',{...options,body:JSON.stringify({token,pageId:attributed.pageId,proof})});
 } catch { /* Site actions remain usable with restricted storage or analytics. */ }
 finally {
  window.removeEventListener(consentChangedEvent,stop);
  window.removeEventListener('storage',storage);
 }
}
