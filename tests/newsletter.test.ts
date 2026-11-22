import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {test} from 'node:test';
import {campaignInput,defaultDesign,subscribeInput,type Mail,type State} from '../src/lib/newsletter/model';
import {createNewsletter} from '../src/lib/newsletter/service';
import {newsletterActionPage,renderCampaign} from '../src/lib/newsletter/render';
import {submittedToken} from '../src/lib/newsletter/http';

const brand={name:'Beispielwerk',legalName:'Beispiel GmbH',origin:'https://example.test',address:'Musterweg 1, Musterstadt',email:'info@example.test'};
function fixture(){
 let state:State|null=null, clock=new Date('2026-11-02T10:00:00Z');
 const mail:Mail[]=[];
 let transmit:((message:Mail)=>Promise<unknown>)|undefined;
 const newsletter=createNewsletter({
  read:async()=>structuredClone(state),
  mutate:async change=>{state=change(structuredClone(state));return structuredClone(state);},
  ready:async()=>true,brand:async()=>brand,now:()=>clock,
  mail:async message=>{mail.push(message);return transmit?.(message);},
 });
 const subscribe=(email:string,groupId?:string)=>newsletter.subscribe(subscribeInput.parse({email,consent:true,source:'/updates',groupId}));
 const token=()=>new URL(mail.at(-1)!.text.match(/https:\/\/example\.test\/api\/newsletter\/confirm\?token=[a-f0-9]{64}/)![0]).searchParams.get('token')!;
 const enable=()=>newsletter.command({action:'settings',settings:{revision:0,enabled:true,provider:'Beispiel Mail'}});
 const draft=async(groupIds:string[]=[])=>{
  const campaign=campaignInput.parse({id:randomUUID(),revision:0,subject:'Neu aus dem Studio',preview:'Ein Update',design:defaultDesign,groupIds,tagLinks:true,
   blocks:[{id:randomUUID(),type:'text',heading:'Neuigkeiten',body:'Guten Tag!'},{id:randomUUID(),type:'button',label:'Ansehen',href:'/angebote'}]});
  await newsletter.command({action:'campaign',campaign});
  return campaign.id;
 };
 return {newsletter,mail,subscribe,token,enable,draft,get state(){return state;},advance:(hours:number)=>clock=new Date(+clock+hours*3600_000),setTransport:(callback:typeof transmit)=>{transmit=callback;}};
}

test('Double-opt-in, group targeting, expiry and disclosure use only the configured site',async()=>{
 const f=fixture();
 assert.equal(await f.newsletter.disclosure(),null);
 assert.equal((await f.newsletter.publicInfo()).enabled,false);
 await assert.rejects(f.subscribe('one@example.test'),/nicht verfügbar/);
 await f.enable();
 const group=randomUUID();
 await f.newsletter.command({action:'group',group:{id:group,name:'Studio-Updates',public:true,revision:0}});
 assert.deepEqual(await f.newsletter.publicInfo(group),{enabled:true,group:'Studio-Updates'});
 await f.subscribe('one@example.test',group);
 const token=f.token();
 assert.equal(f.mail.length,1);
 assert.equal(f.mail[0].unsubscribe,undefined);
 assert.equal(f.state!.subscribers[0].status,'pending');
 assert(!JSON.stringify(f.state).includes(token));
 await f.subscribe('one@example.test',group);
 assert.equal(f.mail.length,1);
 assert.equal(await f.newsletter.confirm(token),true);
 assert.equal(await f.newsletter.confirm(token),true);
 assert.deepEqual((await f.newsletter.workspace()).subscribers[0].groupIds,[group]);
 await f.subscribe('two@example.test');
 const expiring=f.token();
 f.advance(49);
 assert.equal(await f.newsletter.confirm(expiring),false);
 assert.equal(f.state!.subscribers.length,1);
 assert((await f.newsletter.disclosure())?.paragraphs.join(' ').includes('Beispiel Mail'));
 const {totals}=await f.newsletter.stats('2026-11-02','2026-11-02');
 assert.deepEqual(totals,{requested:2,confirmed:1,sent:0,unsubscribed:0});
});

test('Delivery claims are exclusive, withdrawals invalidate snapshots and finished jobs retain aggregate status',async()=>{
 const f=fixture();
 await f.enable();
 for(const email of ['one@example.test','two@example.test','three@example.test']){
  await f.subscribe(email);
  assert.equal(await f.newsletter.confirm(f.token()),true);
 }
 const id=await f.draft();
 const request={action:'queue' as const,id,revision:1,confirmedCount:3};
 await assert.rejects(f.newsletter.command({...request,confirmedCount:2}),/Empfängerkreis/);
 await f.newsletter.command(request);
 const second=f.state!.subscribers[1].unsubscribeKey!;
 assert.equal(await f.newsletter.unsubscribe(second),true);
 let signal!:()=>void,release!:()=>void;
 const started=new Promise<void>(resolve=>{signal=resolve;});
 const gate=new Promise<void>(resolve=>{release=resolve;});
 f.setTransport(async message=>{
  if(message.to==='one@example.test'){signal();await gate;}
  if(message.to==='three@example.test')throw new Error('SMTP disconnected after DATA');
 });
 const first=f.newsletter.pump();
 await started;
 assert.deepEqual(await f.newsletter.pump(),{remaining:true,busy:true});
 release();
 assert.deepEqual(await first,{remaining:false,busy:false});
 const delivery=f.mail.filter(message=>message.unsubscribe);
 assert.deepEqual(delivery.map(message=>message.to),['one@example.test','three@example.test']);
 assert(delivery[0].html.includes('utm_source=newsletter'));
 assert(delivery[0].html.includes('Newsletter abmelden'));
 const campaign=(await f.newsletter.workspace()).campaigns[0];
 assert.equal(campaign.status,'finished');
 assert.equal(campaign.audience,3);
 assert.equal(campaign.counts.sent,1);
 assert.equal(campaign.counts.skipped,1);
 assert.equal(campaign.counts.uncertain,1);
 assert.equal(f.state!.campaigns[0].deliveries.length,0);
 assert(!JSON.stringify(await f.newsletter.workspace()).includes(second));
 assert.deepEqual((await f.newsletter.stats('2026-11-02','2026-11-02')).totals,{requested:3,confirmed:3,sent:1,unsubscribed:1});
});

test('Mail preview escapes copy, excludes non-owned image URLs and scanner GETs have no side effects',async()=>{
 const campaign=campaignInput.parse({
  id:randomUUID(),revision:0,subject:'<text>',preview:'A&B',design:defaultDesign,groupIds:[],tagLinks:true,
  blocks:[{id:randomUUID(),type:'text',heading:'<script>ignore</script>',body:'A&B'},
   {id:randomUUID(),type:'image',src:'https://tracker.example/one.png',alt:'Extern'},
   {id:randomUUID(),type:'button',href:'https://example.org/',label:'Auswärts'}],
 });
 const token='1'.repeat(64),url=brand.origin+'/api/newsletter/unsubscribe?token='+token;
 const email=renderCampaign(campaign,brand,url);
 assert(email.html.includes('&lt;script&gt;'));
 assert(!email.html.includes('<script>'));
 assert(!email.html.includes('tracker.example'));
 assert(!email.html.includes('utm_source='));
 const response=newsletterActionPage('unsubscribe',token);
 assert.equal(response.headers.get('Referrer-Policy'),'no-referrer');
 assert.match(await response.text(),/<form method="post">/);
 const request=()=>new Request(url,{method:'POST',body:new URLSearchParams({'List-Unsubscribe':'One-Click'})});
 assert.equal(await submittedToken(request(),true),token);
 assert.equal(await submittedToken(request(),false),'');
});
