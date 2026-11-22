import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {consentCopy,consentVersion,newsletterDisclosure,newsletterLink,zeroMetrics,type Brand,type Campaign,type CampaignDraft,type Delivery,type DeliveryCounts,type Mail,type Metric,type NewsletterCommand,type State,type Subscriber,type Workspace} from './model';
import {renderCampaign,renderConfirmation} from './render';
import type {subscribeInput} from './model';
import type {z} from 'zod';

export class NewsletterError extends Error{
 constructor(message:string,readonly status=400){super(message);}
}
type Deps={
 read():Promise<State|null>;
 mutate(update:(previous:State|null)=>State):Promise<State>;
 brand():Promise<Brand>;
 ready():Promise<boolean>;
 mail(message:Mail):Promise<unknown>;
 now?:()=>Date;
};
const createState=():State=>({settings:{revision:0,enabled:false,everEnabled:false,provider:''},groups:[],subscribers:[],campaigns:[],days:{}});
const unique=(values:string[])=>[...new Set(values)];
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
const secret=()=>randomBytes(32).toString('hex');
const clockTime=(time:Date,minutes:number)=>new Date(+time+minutes*60_000).toISOString();
const day=(value:Date)=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).format(value);
const isWaiting=(delivery:Delivery)=>delivery.status==='queued'||delivery.status==='sending';
function addMetric(state:State,now:Date,metric:Metric){
 const key=day(now);(state.days[key]??=zeroMetrics())[metric]++;
}
function deliveryCounts(deliveries:Delivery[]):DeliveryCounts{
 const counts={queued:0,sending:0,sent:0,skipped:0,failed:0,uncertain:0};
 for(const delivery of deliveries)counts[delivery.status]++;
 return counts;
}
function settle(campaign:Campaign){
 if(campaign.deliveries.some(isWaiting))return;
 if(campaign.status==='queued')campaign.status='finished';
 if((campaign.status==='finished'||campaign.status==='stopped')&&campaign.deliveries.length){
  campaign.totals=deliveryCounts(campaign.deliveries);
  campaign.deliveries=[];
 }
}
function cleanup(state:State,now:Date){
 const at=now.toISOString(),before=day(new Date(+now-400*86400_000));
 state.subscribers=state.subscribers.filter(subscriber=>subscriber.status!=='pending'||Boolean(subscriber.pending&&subscriber.pending.expiresAt>at));
 for(const subscriber of state.subscribers)if(subscriber.pending&&subscriber.pending.expiresAt<=at)delete subscriber.pending;
 for(const key of Object.keys(state.days))if(key<before)delete state.days[key];
 for(const campaign of state.campaigns){
  for(const delivery of campaign.deliveries)if(delivery.status==='sending'&&delivery.at&&delivery.at<=clockTime(now,-5))delivery.status='uncertain';
  settle(campaign);
 }
}
function matches(subscriber:Subscriber,groupIds:string[]){
 return subscriber.status==='confirmed'&&Boolean(subscriber.consent&&subscriber.unsubscribeKey)&&(!groupIds.length||subscriber.groupIds.some(id=>groupIds.includes(id)));
}
function checked<T extends {id:string;revision:number}>(records:T[],id:string,revision:number):T{
 const record=records.find(item=>item.id===id);
 if(!record||record.revision!==revision)throw new NewsletterError('Dieser Eintrag wurde inzwischen geändert. Bitte laden Sie den aktuellen Stand.',409);
 return record;
}
function groupsExist(state:State,groups:string[]){
 if(groups.some(id=>!state.groups.some(group=>group.id===id)))throw new NewsletterError('Eine gewählte Gruppe ist nicht mehr verfügbar.',409);
 return unique(groups);
}
function validateCampaign(campaign:CampaignDraft,brand:Brand){
 if(!campaign.blocks.some(block=>block.type==='text'&&(block.heading.trim()||block.body.trim())))
  throw new NewsletterError('Fügen Sie der Ausgabe mindestens einen Textblock mit Inhalt hinzu.');
 for(const block of campaign.blocks){
  if(block.type==='image'&&(!newsletterLink(block.src,brand.origin,true)||!block.alt.trim()))throw new NewsletterError('Jedes Bild braucht eine eigene Medienadresse und einen Alternativtext.');
  if(block.type==='button'&&(!newsletterLink(block.href,brand.origin)||!block.label.trim()))throw new NewsletterError('Jeder Button braucht einen Text und einen gültigen Link.');
 }
}
function configuredBrand(brand:Brand){
 try{
  const origin=new URL(brand.origin);
  const secure=origin.protocol==='https:'||origin.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(origin.hostname);
  return Boolean(brand.name&&brand.legalName&&brand.address&&brand.email&&secure&&!origin.username&&!origin.password);
 }catch{return false;}
}
function updateSubscriber(subscriber:Subscriber,status:Subscriber['status']){
 subscriber.status=status;subscriber.revision++;
}

export function createNewsletter(deps:Deps){
 const now=()=>deps.now?.()??new Date();
 const read=async()=>await deps.read()??createState();
 const mutate=(change:(state:State,at:Date)=>void)=>{
  const time=now();
  return deps.mutate(previous=>{const state=structuredClone(previous??createState());cleanup(state,time);change(state,time);return state;});
 };
 async function workspace():Promise<Workspace>{
  const [state,brand,mailReady]=await Promise.all([read(),deps.brand(),deps.ready()]);
  return {
   settings:state.settings,groups:state.groups,brand,mailReady:mailReady&&configuredBrand(brand),
   subscribers:state.subscribers.filter(person=>person.status!=='pending'||(person.pending?.expiresAt??'')>now().toISOString()).map(
    ({id,email,revision,status,groupIds,consent,unsubscribedAt})=>({id,email,revision,status,groupIds,confirmedAt:consent?.confirmedAt,source:consent?.source,version:consent?.version,unsubscribedAt})),
   campaigns:state.campaigns.map(({deliveries,totals,...campaign})=>{
    const counts=totals??deliveryCounts(deliveries);
    const audience=campaign.status==='draft'?state.subscribers.filter(person=>matches(person,campaign.groupIds)).length:Object.values(counts).reduce((sum,count)=>sum+count,0);
    return {...campaign,counts,audience};
   }),
  };
 }
 async function publicInfo(groupId?:string){
  const state=await read(),group=state.groups.find(item=>item.id===groupId&&item.public);
  return {enabled:state.settings.enabled&&(!groupId||Boolean(group))&&await deps.ready(),group:group?.name??null};
 }
 async function disclosure(){
  const {settings}=await read();
  return settings.everEnabled&&settings.provider?newsletterDisclosure(settings.provider):null;
 }
 async function subscribe(input:z.infer<typeof subscribeInput>){
  if(input.website)return;
  const [brand,ready]=await Promise.all([deps.brand(),deps.ready()]);
  if(!ready||!configuredBrand(brand))throw new NewsletterError('Die Anmeldung ist gerade nicht verfügbar.',503);
  const token=secret(),digest=hash(token),id=randomUUID();
  const state=await mutate((current,at)=>{
   if(!current.settings.enabled||input.groupId&&!current.groups.some(group=>group.id===input.groupId&&group.public))
    throw new NewsletterError('Diese Anmeldung ist derzeit nicht verfügbar.',404);
   let person=current.subscribers.find(item=>item.email===input.email);
   if(person?.status==='confirmed'||person?.pending&&person.pending.requestedAt>clockTime(at,-15))return;
   if(!person){
    if(current.subscribers.length>=2500)throw new NewsletterError('Die Anmeldung ist vorübergehend nicht verfügbar.',503);
    person={id,email:input.email,revision:0,status:'pending',groupIds:[]};current.subscribers.push(person);
   }
   person.revision++;
   person.pending={hash:digest,requestedAt:at.toISOString(),expiresAt:clockTime(at,2880),source:input.source,groupId:input.groupId};
   addMetric(current,at,'requested');
  });
  if(!state.subscribers.some(person=>person.pending?.hash===digest))return;
  const link=new URL('/api/newsletter/confirm?token='+token,brand.origin).href;
  try{await deps.mail({to:input.email,id:'newsletter-confirm-'+digest,...renderConfirmation(brand,link)});}
  catch{console.warn('Newsletter confirmation could not be delivered');}
 }
 async function confirm(token:string){
  const digest=hash(token),unsubscribeKey=secret();
  const state=await mutate((current,at)=>{
   if(!current.settings.enabled)return;
   const person=current.subscribers.find(item=>item.pending?.hash===digest);
   if(!person?.pending||person.pending.expiresAt<=at.toISOString())return;
   const request=person.pending;
   person.consent={id:digest,copy:consentCopy,version:consentVersion,source:request.source,requestedAt:request.requestedAt,confirmedAt:at.toISOString()};
   person.unsubscribeKey=unsubscribeKey;
   person.groupIds=request.groupId&&current.groups.some(group=>group.id===request.groupId)?[request.groupId]:[];
   delete person.pending;delete person.unsubscribedAt;
   updateSubscriber(person,'confirmed');addMetric(current,at,'confirmed');
  });
  return state.subscribers.some(person=>person.consent?.id===digest&&person.status==='confirmed');
 }
 async function unsubscribe(token:string){
  const state=await mutate((current,at)=>{
   const person=current.subscribers.find(item=>item.unsubscribeKey===token);
   if(!person||person.status!=='confirmed')return;
   person.unsubscribedAt=at.toISOString();
   person.groupIds=[];
   delete person.pending;
   updateSubscriber(person,'unsubscribed');addMetric(current,at,'unsubscribed');
  });
  return state.subscribers.some(person=>person.unsubscribeKey===token&&person.status==='unsubscribed');
 }

 async function command(input:Exclude<NewsletterCommand,{action:'pump'}>){
  const needsMail=input.action==='queue'||input.action==='settings'&&input.settings.enabled;
  const [brand,ready]=needsMail?await Promise.all([deps.brand(),deps.ready()]):[undefined,false];
  if(needsMail&&(!ready||!brand||!configuredBrand(brand)))throw new NewsletterError('Hinterlegen Sie zuerst den Mailversand und die vollständigen Anbieterangaben.',409);
  await mutate((state,at)=>{
   switch(input.action){
    case 'settings': {
     const {settings}=input;
     if(settings.revision!==state.settings.revision)throw new NewsletterError('Die Einstellungen wurden inzwischen geändert.',409);
     if(settings.enabled&&!settings.provider||state.settings.everEnabled&&!settings.provider)throw new NewsletterError('Tragen Sie den Namen des Mailanbieters für den Datenschutzhinweis ein.');
     state.settings={...settings,everEnabled:state.settings.everEnabled||settings.enabled,revision:settings.revision+1};
     break;
    }
    case 'group': {
     const {group}=input;
     if(state.groups.some(item=>item.id!==group.id&&item.name.toLowerCase()===group.name.toLowerCase()))throw new NewsletterError('Eine Gruppe mit diesem Namen existiert bereits.',409);
     if(group.revision)Object.assign(checked(state.groups,group.id,group.revision),{...group,revision:group.revision+1});
     else {
      if(state.groups.length>=48||state.groups.some(item=>item.id===group.id))throw new NewsletterError('Diese Gruppe kann nicht angelegt werden.',409);
      state.groups.push({...group,revision:1});
     }
     break;
    }
    case 'remove-group':
     checked(state.groups,input.id,input.revision);
     if(state.campaigns.some(campaign=>campaign.status==='draft'&&campaign.groupIds.includes(input.id)))throw new NewsletterError('Entfernen Sie die Gruppe zuerst aus den betroffenen Entwürfen.',409);
     state.groups=state.groups.filter(group=>group.id!==input.id);
     for(const person of state.subscribers)if(person.groupIds.includes(input.id)){person.groupIds=person.groupIds.filter(id=>id!==input.id);person.revision++;}
     break;
    case 'subscriber-groups': {
     const person=checked(state.subscribers,input.id,input.revision);
     if(person.status!=='confirmed')throw new NewsletterError('Gruppen können nach der Bestätigung zugewiesen werden.',409);
     person.groupIds=groupsExist(state,input.groupIds);person.revision++;
     break;
    }
    case 'remove-subscriber':
     checked(state.subscribers,input.id,input.revision);
     state.subscribers=state.subscribers.filter(person=>person.id!==input.id);
     break;
    case 'campaign': {
     const next=input.campaign, groupIds=groupsExist(state,next.groupIds);
     if(next.revision){
      const existing=checked(state.campaigns,next.id,next.revision);
      if(existing.status!=='draft')throw new NewsletterError('Diese Ausgabe ist bereits für den Versand gespeichert.',409);
      Object.assign(existing,{...next,groupIds,revision:next.revision+1,updatedAt:at.toISOString()});
     }else{
      if(state.campaigns.length>=180||state.campaigns.some(campaign=>campaign.id===next.id))throw new NewsletterError('Die Ausgabe kann nicht angelegt werden. Entfernen Sie ältere Entwürfe.',409);
      state.campaigns.unshift({...next,groupIds,revision:1,status:'draft',updatedAt:at.toISOString(),deliveries:[]});
     }
     break;
    }
    case 'remove-campaign': {
     const existing=checked(state.campaigns,input.id,input.revision);
     if(existing.status==='queued'||existing.deliveries.some(isWaiting))throw new NewsletterError('Stoppen Sie zuerst den laufenden Versand.',409);
     state.campaigns=state.campaigns.filter(campaign=>campaign.id!==input.id);
     break;
    }
    case 'queue': {
     const campaign=checked(state.campaigns,input.id,input.revision);
     if(!state.settings.enabled||campaign.status!=='draft')throw new NewsletterError('Nur gespeicherte Entwürfe können bei aktivem Newsletter versendet werden.',409);
     validateCampaign(campaign,brand!);groupsExist(state,campaign.groupIds);
     const audience=state.subscribers.filter(person=>matches(person,campaign.groupIds));
     if(audience.length!==input.confirmedCount)throw new NewsletterError('Der Empfängerkreis hat sich geändert. Laden Sie die aktuelle Anzahl und bestätigen Sie erneut.',409);
     const pending=state.campaigns.reduce((sum,item)=>sum+item.deliveries.length,0);
     if(pending+audience.length>7500)throw new NewsletterError('Bitte warten Sie, bis eine laufende Ausgabe abgeschlossen ist.',409);
     const queuedAt=at.toISOString();
     campaign.deliveries=audience.map(person=>({subscriberId:person.id,consentId:person.consent!.id,status:'queued'}));
     Object.assign(campaign,{status:'queued',revision:campaign.revision+1,updatedAt:queuedAt,queuedAt});
     break;
    }
    case 'stop': {
     const campaign=checked(state.campaigns,input.id,input.revision);
     if(campaign.status!=='queued')throw new NewsletterError('Dieser Versand läuft nicht.',409);
     for(const delivery of campaign.deliveries)if(delivery.status==='queued')delivery.status='skipped';
     campaign.status='stopped';campaign.revision++;campaign.updatedAt=at.toISOString();settle(campaign);
     break;
    }
   }
  });
 }

 async function hasPending(){
  const state=await read();
  return state.settings.enabled&&state.campaigns.some(campaign=>campaign.status==='queued'&&campaign.deliveries.some(isWaiting));
 }
 async function pump(limit=3){
  const [brand,ready]=await Promise.all([deps.brand(),deps.ready()]);
  if(!ready||!configuredBrand(brand)||!await hasPending())return {remaining:false,busy:false};
  const token=randomUUID();
  const leased=await mutate((state,at)=>{
   if(state.settings.enabled&&(!state.lease||state.lease.until<=at.toISOString()))state.lease={token,until:clockTime(at,3)};
  });
  if(leased.lease?.token!==token)return {remaining:true,busy:true};
  try{
   const deadline=Date.now()+20_000;
   for(let sent=0;sent<limit&&Date.now()<deadline;sent++){
    const attempt=randomUUID();
    const claimed=await mutate((state,at)=>{
     if(!state.settings.enabled||state.lease?.token!==token||state.lease.until<=at.toISOString())return;
     const people=new Map(state.subscribers.map(person=>[person.id,person]));
     for(const campaign of [...state.campaigns].reverse()){
      if(campaign.status!=='queued')continue;
      for(const delivery of campaign.deliveries){
       if(delivery.status!=='queued')continue;
       const person=people.get(delivery.subscriberId);
       if(person?.status!=='confirmed'||person.consent?.id!==delivery.consentId||!person.unsubscribeKey){delivery.status='skipped';continue;}
       Object.assign(delivery,{status:'sending',attempt,at:at.toISOString()});
       return;
      }
      settle(campaign);
     }
    });
    const campaign=claimed.campaigns.find(item=>item.deliveries.some(delivery=>delivery.attempt===attempt));
    if(!campaign)break;
    const delivery=campaign.deliveries.find(item=>item.attempt===attempt)!;
    const current=await read();
    const person=current.subscribers.find(item=>item.id===delivery.subscriberId);
    let result:Delivery['status']='skipped';
    if(current.settings.enabled&&current.lease?.token===token&&current.campaigns.some(item=>item.id===campaign.id&&item.status==='queued')&&person?.status==='confirmed'&&person.consent?.id===delivery.consentId&&person.unsubscribeKey){
     const unsubscribe=new URL('/api/newsletter/unsubscribe?token='+person.unsubscribeKey,brand.origin).href;
     const message=renderCampaign(campaign,brand,unsubscribe);
     try{await deps.mail({...message,id:'newsletter-'+campaign.id+'-'+person.id,to:person.email,unsubscribe});result='sent';}
     catch(error){const reply=(error as {responseCode?:number})?.responseCode;result=reply&&reply>=400?'failed':'uncertain';}
    }
    await mutate((state,at)=>{
     const saved=state.campaigns.find(item=>item.id===campaign.id);
     const job=saved?.deliveries.find(item=>item.attempt===attempt&&item.status==='sending');
     if(!saved||!job)return;
     job.status=result;job.at=at.toISOString();
     if(result==='sent')addMetric(state,at,'sent');
     settle(saved);
    });
   }
  }finally{await mutate(state=>{if(state.lease?.token===token)delete state.lease;});}
  return {remaining:await hasPending(),busy:false};
 }
 async function stats(from:string,to:string){
  const state=await read(),totals=zeroMetrics();
  for(const [date,values] of Object.entries(state.days))if(date>=from&&date<=to)
   for(const key of Object.keys(totals) as Metric[])totals[key]+=values[key];
  return {active:state.settings.everEnabled,confirmed:state.subscribers.filter(person=>person.status==='confirmed').length,totals};
 }
 const prune=async()=>{if(await deps.read())await mutate(()=>{});};
 return {workspace,publicInfo,disclosure,subscribe,confirm,unsubscribe,command,pump,hasPending,stats,prune};
}
