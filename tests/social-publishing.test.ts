import test from 'node:test';

import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {getSeedProjects} from '../src/lib/social/catalog';
import {projectSchema,type SocialBrandProfile} from '../src/lib/social/model';
import {isUploadedSource,publicationSourceSchema,type PublicationDraft,type StudioPublicationSource,type PublishingMedia,type PlannerReadiness} from '../src/lib/social/publishing/model';
import {publicationContentKey,uploadMediaMatches,acceptUploadedPublication,PublishingStateError} from '../src/lib/social/publishing/state';
import {resolveWallTime} from '../src/lib/social/publishing/time';
import {nextPublishingControl} from '../src/lib/social/publishing/activation';
import type {SiteConfig} from '../src/lib/types';
import {createPlannerOperations} from '../src/lib/server/social/publishing/operations';
import {createPublishingScheduler,type PublishingTick} from '../src/lib/server/social/publishing/scheduler';
import {InstagramError,type InstagramDriver} from '../src/lib/server/social/publishing/instagram';
import {PlannerError,publishingHash,type PublishingRepository,type StoredPublication,type StoredConnection,wakeFor} from '../src/lib/server/social/publishing/types';
import {queueMessageSignature,verifyQueueMessage} from '../src/lib/server/social/publishing/queue-auth';
import {mediaSignature,validateMediaSignature,publishingMediaResponse} from '../src/lib/server/social/publishing/signed-media';

const brand:SocialBrandProfile={name:'Beispielbetrieb',website:'https://example.org',accent:'#cb7241',ink:'#153d32',paper:'#faf6ed',headlineFont:'manrope',bodyFont:'dm-sans'};
function fixture(){
 let clock='2026-11-02T08:00:00.000Z',epoch=0,queueFail=false,queueAck:string|null='queue-message',ambiguous=false,providerPublished=false,reads=0;
 const project=projectSchema.parse(getSeedProjects(brand)[0]),source:StudioPublicationSource={projectId:project.id,projectRevision:0,title:project.title,brandKey:'default',brandLabel:brand.name,formatId:project.formatId,kind:project.kind,slides:project.slides.length,snapshotHash:publishingHash(project)};
 const publications=new Map<string,StoredPublication>(),connections=new Map<string,StoredConnection>(),sent:PublishingTick[]=[];
 const calls={account:0,quota:0,create:0,status:0,publish:0};
 const repo:PublishingRepository={
  epoch:async()=>{reads++;return epoch;},publication:async id=>{reads++;return structuredClone(publications.get(id)??null);},publications:async()=>{reads++;return structuredClone([...publications.values()]);},
  mutatePublication:async(id,update)=>{const next=update(structuredClone(publications.get(id)??null));publications.set(id,structuredClone(next));return structuredClone(next);},
  connection:async id=>{reads++;return structuredClone(connections.get(id)??null);},connections:async()=>{reads++;return structuredClone([...connections.values()]);},
  mutateConnection:async(id,update)=>{const next=update(structuredClone(connections.get(id)??null));connections.set(id,structuredClone(next));return structuredClone(next);},
  source:async()=>({source:structuredClone(source),project:structuredClone(project)}),sources:async()=>[structuredClone(source)],referenceBrandLabel:async()=>brand.name
 };
 const driver:InstagramDriver={checkAccount:async()=>{calls.account++;return{id:'123456789',username:'example',accountType:'BUSINESS'};},quota:async()=>{calls.quota++;return{usage:0,total:100};},createImage:async()=>{calls.create++;return'123450001';},createCarousel:async()=>{calls.create++;return'123450003';},createReel:async()=>{calls.create++;return'123450002';},status:async()=>{calls.status++;return providerPublished?'PUBLISHED':'FINISHED';},publish:async()=>{calls.publish++;if(ambiguous)throw new InstagramError('Die letzte Antwort ist unklar.','ambiguous');return'123459999';},refresh:async()=>({accessToken:'fixture-refreshed-token',expiresIn:100000})};
 const ready:PlannerReadiness={enabled:true,queue:true,media:true,publicOrigin:true,messages:[]};
 const deps={repo,driver,now:()=>clock,readiness:async()=>({...ready}),encrypt:(value:string)=>'encrypted:'+value,decrypt:(value:string)=>value.replace(/^encrypted:/,''),verifyMedia:async(row:StoredPublication)=>{if(!row.entry.media)throw new PlannerError('Medien fehlen.');}};
 const queueKeys:string[]=[];
 const operations=createPlannerOperations(deps),scheduler=createPublishingScheduler({...deps,uuid:randomUUID,providerUrl:async()=> 'https://example.org/api/social/publishing-media/fixture',enqueue:async(message,options)=>{queueKeys.push(options.idempotencyKey);if(queueFail)throw new Error('injected transport failure');sent.push(message);return{messageId:queueAck};}});
 const action=(id:string)=>({id,idempotencyKey:randomUUID(),baseRevision:publications.get(id)!.entry.revision});
 const draft=(patch:Partial<PublicationDraft>={}):PublicationDraft=>({id:randomUUID(),source:structuredClone(source),kind:'image',slideIndex:0,caption:'Ein eigener Beitrag.',altText:'Ein Beispielmotiv',accountId:null,scheduledAt:'2026-11-02T08:20:00.000Z',timeZone:'Europe/Berlin',platform:'instagram',delivery:'automatic',...patch});
 async function connect(){const id=randomUUID();let view=await operations.saveConnection({id,idempotencyKey:randomUUID(),baseRevision:0,brandKey:'default',label:'Eigener Testzugang',accountId:'123456789',accessToken:'fixture-token-not-a-real-account',expiresAt:'2027-02-01T00:00:00.000Z',permissionsConfirmed:true});view=await operations.checkConnection({id,idempotencyKey:randomUUID(),baseRevision:view.revision});return view;}
 async function prepared(){const connection=await connect(),input=draft({accountId:connection.id});let entry=await operations.save({idempotencyKey:randomUUID(),baseRevision:0,draft:input});const media:PublishingMedia={id:randomUUID(),sha256:publishingHash('frozen-bytes'),sourceHash:source.snapshotHash,kind:'image',slideIndex:0,mimeType:'image/jpeg',width:1080,height:1350,bytes:500,createdAt:clock};entry=await operations.prepare({...action(entry.id),media});return entry;}
 async function approved(){const entry=await prepared();return operations.approve(action(entry.id),'Fixture owner');}
 async function next(id:string){const row=publications.get(id)!;assert(row.wake);clock=row.wake.at;await scheduler.tick({publicationId:id,generation:row.entry.generation,wakeId:row.wake.id});return publications.get(id)!;}
 return{repo,driver,deps,queueKeys,project,source,publications,connections,operations,scheduler,calls,ready,sent,action,draft,connect,prepared,approved,next,setTime:(at:string)=>{clock=at;},setEpoch:(value:number)=>{epoch=value;},setQueueFailure:(value:boolean)=>{queueFail=value;},setQueueAck:(value:string|null)=>{queueAck=value;},setAmbiguous:(value:boolean)=>{ambiguous=value;},setPublished:()=>{providerPublished=true;},reads:()=>reads};
}

test('planning works unconfigured; frozen content, idempotency and CAS protect drafts',async()=>{
 const f=fixture();f.ready.queue=false;f.ready.publicOrigin=false;const draft=f.draft(),input={idempotencyKey:randomUUID(),baseRevision:0,draft};
 const entry=await f.operations.save(input);assert.equal(entry.status,'draft');assert.deepEqual(await f.operations.save(input),entry);
 await assert.rejects(f.operations.save({...input,idempotencyKey:randomUUID()}),PlannerError);
 await assert.rejects(f.operations.save({...input,draft:{...draft,caption:'Different payload'}}),PlannerError);
 const local={...draft,caption:'New local caption'};const updated=await f.operations.save({idempotencyKey:randomUUID(),baseRevision:1,draft:local});
 assert.equal(updated.caption,local.caption);assert.equal(draft.caption,'Ein eigener Beitrag.');assert.equal((await f.operations.load(entry.id)).project!.brand.name,brand.name);
 await assert.rejects(f.operations.approve(f.action(entry.id),'Owner'),error=>error instanceof PlannerError&&error.status===503);
 assert.equal(f.calls.publish,0);
});

test('workspace and recovery perform zero private reads when disabled',async()=>{
 const f=fixture();f.ready.enabled=false;await assert.rejects(f.operations.workspace(),error=>error instanceof PlannerError&&error.status===403);assert.deepEqual(await f.scheduler.recover(),{checked:0,enqueued:0});assert.equal(f.reads(),0);assert.deepEqual(f.calls,{account:0,quota:0,create:0,status:0,publish:0});
});

test('connections expose no saved secret, require explicit checks and pause old approvals',async()=>{
 const f=fixture(),entry=await f.approved(),connection=f.connections.get(entry.accountId!)!;
 assert.equal(connection.view.status,'connected');assert(!JSON.stringify((await f.operations.workspace()).connections).includes('fixture-token'));
 await f.operations.disconnect({id:connection.view.id,idempotencyKey:randomUUID(),baseRevision:connection.view.revision});
 const paused=f.publications.get(entry.id)!.entry;assert.equal(paused.status,'needs_review');assert.equal(paused.approval,null);assert.equal(f.connections.get(connection.view.id)!.tokenCiphertext,'');
 await f.scheduler.tick({publicationId:entry.id,generation:entry.generation,wakeId:'a'.repeat(64)});assert.equal(f.calls.create,0);
});

test('media preparation is bound to exact source, kind and slide',async()=>{
 const f=fixture(),entry=await f.prepared(),media=entry.media!;
 await assert.rejects(f.operations.prepare({...f.action(entry.id),media:{...media,sourceHash:'b'.repeat(64)}}));
 const updated=await f.operations.save({idempotencyKey:randomUUID(),baseRevision:f.publications.get(entry.id)!.entry.revision,draft:{...f.draft({id:entry.id}),caption:'New caption'}});assert.equal(updated.media?.id,media.id);assert.equal(updated.approval,null);
 f.source.kind='reel';f.source.slides=2;
 await assert.rejects(f.operations.save({idempotencyKey:randomUUID(),baseRevision:0,draft:f.draft({kind:'reel',slideIndex:1})}),PlannerError);
});

test('container, polling and final publish run as durable separate checkpoints',async()=>{
 const f=fixture(),entry=await f.approved();assert.equal(entry.status,'scheduling');await f.scheduler.dispatch(entry.id);assert.equal(f.publications.get(entry.id)!.entry.status,'scheduled');
 const first=f.sent[0];let row=await f.next(entry.id);assert.equal(row.entry.process.containerId,'123450001');assert.equal(row.entry.process.phase,'poll');assert.equal(f.calls.publish,0);
 await f.scheduler.tick(first);assert.equal(f.calls.create,1);
 row=await f.next(entry.id);assert.equal(row.entry.process.phase,'publish');assert.equal(f.calls.publish,0);
 row=await f.next(entry.id);assert.equal(row.entry.status,'published');assert.equal(row.entry.process.mediaId,'123459999');assert.equal(f.calls.publish,1);
 await f.scheduler.tick(first);assert.equal(f.calls.publish,1);await assert.rejects(f.operations.save({idempotencyKey:randomUUID(),baseRevision:f.publications.get(entry.id)!.entry.revision,draft:f.draft({id:entry.id})}));
});

test('unacknowledged enqueue remains pending and long future jobs enqueue only in the six-day horizon',async()=>{
 const f=fixture(),entry=await f.approved();f.setQueueAck(null);await f.scheduler.dispatch(entry.id);assert.equal(f.publications.get(entry.id)!.entry.status,'scheduling');assert.equal(f.sent.length,1);
 await f.scheduler.recover();assert.equal(f.sent.length,1);
 const g=fixture(),prepared=await g.prepared(),later=await g.operations.save({idempotencyKey:randomUUID(),baseRevision:prepared.revision,draft:g.draft({id:prepared.id,accountId:prepared.accountId,scheduledAt:'2026-11-22T08:20:00.000Z'})});
 await g.operations.approve(g.action(later.id),'Fixture');await g.scheduler.dispatch(later.id);assert.equal(g.sent.length,0);g.setTime('2026-11-18T08:00:00.000Z');await g.scheduler.recover();assert.equal(g.sent.length,1);
});

test('checkpoint enqueue failure is recovered by retrying the old wake without recreating media',async()=>{
 const f=fixture(),entry=await f.approved();await f.scheduler.dispatch(entry.id);const message=f.sent[0];f.setTime(f.publications.get(entry.id)!.wake!.at);f.setQueueFailure(true);
 await assert.rejects(f.scheduler.tick(message),/Warteschlangenschritt/);assert.equal(f.calls.create,1);assert.equal(f.publications.get(entry.id)!.entry.process.phase,'poll');
 f.setQueueFailure(false);await f.scheduler.tick(message);assert.equal(f.calls.create,1);assert.equal(f.sent.length,2);assert(f.publications.get(entry.id)!.wake!.queuedAt);
});

test('cancelled and obsolete deliveries do not call a provider',async()=>{
 const f=fixture(),entry=await f.approved();await f.scheduler.dispatch(entry.id);const message=f.sent[0];await f.operations.cancel(f.action(entry.id));await f.scheduler.tick(message);assert.equal(f.calls.quota,0);assert.equal(f.calls.create,0);
});

test('disable then re-enable and restored old enabled config invalidate the old approval epoch',async()=>{
 const f=fixture(),entry=await f.approved();await f.scheduler.dispatch(entry.id);const message=f.sent[0];
 const off={modules:{socialStudio:{enabled:true},socialPublishing:{enabled:false}}} as SiteConfig,on={modules:{socialStudio:{enabled:true},socialPublishing:{enabled:true}}} as SiteConfig;
 let control=nextPublishingControl(on,off,undefined);assert.equal(control?.epoch,1);control=nextPublishingControl(off,on,control);assert.equal(control?.epoch,1);f.setEpoch(control!.epoch);f.setTime(f.publications.get(entry.id)!.wake!.at);await f.scheduler.tick(message);
 assert.equal(f.publications.get(entry.id)!.entry.status,'needs_review');assert.equal(f.calls.create,0);
 const g=fixture(),old=await g.approved();g.setEpoch(2);const workspace=await g.operations.workspace();assert.equal(workspace.entries[0].status,'needs_review');assert.equal(g.publications.get(old.id)!.entry.approval,null);
 assert.equal(nextPublishingControl(off,off,control),control);assert.equal(nextPublishingControl(on,on,control),control);
});

test('mutated source bytes and connection generations prevent provider work',async()=>{
 for(const change of ['source','connection'] as const){const f=fixture(),entry=await f.approved();if(change==='source')f.publications.get(entry.id)!.projectSnapshot!.caption='tampered';else f.connections.get(entry.accountId!)!.view.generation++;
 await f.next(entry.id);assert.equal(f.publications.get(entry.id)!.entry.status,'needs_review');assert.equal(f.calls.create,0);}
});

test('ambiguous final response never repeats POST; only provider-confirmed reconciliation publishes',async()=>{
 const f=fixture(),entry=await f.approved();await f.next(entry.id);await f.next(entry.id);const before=f.publications.get(entry.id)!,message={publicationId:entry.id,generation:before.entry.generation,wakeId:before.wake!.id};f.setAmbiguous(true);await f.next(entry.id);
 assert.equal(f.publications.get(entry.id)!.entry.status,'needs_review');assert.equal(f.calls.publish,1);await f.scheduler.tick(message);assert.equal(f.calls.publish,1);
 let reviewed=await f.operations.reconcile(f.action(entry.id));assert.equal(reviewed.status,'needs_review');f.setPublished();reviewed=await f.operations.reconcile(f.action(entry.id));assert.equal(reviewed.status,'published');assert.equal(f.calls.publish,1);
});

test('a persisted final-request marker pauses after a crash and locks credential changes',async()=>{
 const f=fixture(),entry=await f.approved();await f.next(entry.id);await f.next(entry.id);const row=f.publications.get(entry.id)!;row.entry.status='processing';row.entry.process.publishStartedAt='2026-11-02T08:20:00.000Z';row.entry.lease=null;
 const connection=f.connections.get(entry.accountId!)!;await assert.rejects(f.operations.disconnect({id:connection.view.id,baseRevision:connection.view.revision,idempotencyKey:randomUUID()}),/finale Instagram/);
 await f.next(entry.id);assert.equal(f.publications.get(entry.id)!.entry.status,'needs_review');assert.equal(f.calls.publish,0);
});

test('queue proof binds own topic, publication, generation, wake and secret',()=>{
 const secret='fixture-secret-'.repeat(4),message={publicationId:randomUUID(),generation:3,wakeId:'a'.repeat(64)},signed={...message,auth:queueMessageSignature(message,secret)};
 assert.deepEqual(verifyQueueMessage(signed,secret),message);
 for(const altered of [{...signed,generation:4},{...signed,wakeId:'b'.repeat(64)},{...signed,publicationId:randomUUID()}])assert.throws(()=>verifyQueueMessage(altered,secret));
 assert.throws(()=>verifyQueueMessage(signed,'different-secret-'.repeat(4)));assert.throws(()=>verifyQueueMessage({...signed,auth:undefined},secret));
});

test('signed media rejects tampering, expiry and overly long permissions; HEAD/range are exact',async()=>{
 const secret='fixture-secret-'.repeat(4),now=Date.parse('2026-11-02T08:00:00Z'),input={publication:randomUUID(),id:randomUUID(),generation:2,expires:Math.floor(now/1000)+3600,signature:''};input.signature=mediaSignature([input.publication,input.id,input.generation,input.expires].join(':'),secret);
 assert.doesNotThrow(()=>validateMediaSignature(input,secret,now));for(const altered of [{...input,generation:3},{...input,expires:input.expires+100},{...input,expires:1}])assert.throws(()=>validateMediaSignature(altered,secret,now));
 const media={bytes:Buffer.from('0123456789'),data:{mimeType:'video/mp4'} as PublishingMedia};const head=publishingMediaResponse(media,new Request('https://example.org/media',{method:'HEAD'}));assert.equal(head.headers.get('content-length'),'10');assert.equal(await head.text(),'');
 for(const[range,text,header]of [['bytes=2-4','234','bytes 2-4/10'],['bytes=-3','789','bytes 7-9/10'],['bytes=8-','89','bytes 8-9/10']]){const result=publishingMediaResponse(media,new Request('https://example.org/media',{headers:{range}}));assert.equal(result.status,206);assert.equal(result.headers.get('content-range'),header);assert.equal(await result.text(),text);}
 for(const range of ['bytes=100-','bytes=3-1','bytes=1-2,5-6','bytes=-0'])assert.equal(publishingMediaResponse(media,new Request('https://example.org/media',{headers:{range}})).status,416);
});

test('Berlin daylight-saving gaps and duplicated wall time require an explicit offset',()=>{
 assert.equal(resolveWallTime('2027-03-28T02:30','Europe/Berlin').length,0);const duplicate=resolveWallTime('2027-10-31T02:30','Europe/Berlin');assert.equal(duplicate.length,2);assert.notEqual(duplicate[0].instant,duplicate[1].instant);
 assert.equal(resolveWallTime('2026-11-02T10:00','Europe/Paris').length,1);
});

function uploadInput(f:ReturnType<typeof fixture>,id:string=randomUUID(),baseRevision=0){
 const idempotencyKey=randomUUID(),sha256=publishingHash('accepted normalized bytes');
 const request={id,idempotencyKey,baseRevision,brandKey:'default',title:'Fertiger Beitrag'},media:PublishingMedia={id:idempotencyKey,sha256,sourceHash:sha256,kind:'image',slideIndex:0,mimeType:'image/jpeg',width:1080,height:1350,bytes:800,createdAt:'2026-11-02T08:00:00.000Z'};
 return{request,filename:'fertiger-beitrag.jpg',requestHash:publishingHash({request,bytes:'original file hash'}),media,brandLabel:brand.name};
}

test('legacy Studio source parsing does not inject origin or change existing content hashes',()=>{
 const f=fixture(),{platform,delivery,targetLabel,...draft}=f.draft(),before=JSON.stringify(draft.source);assert.equal(JSON.stringify(publicationSourceSchema.parse(draft.source)),before);assert(!('origin'in publicationSourceSchema.parse(draft.source)));
 assert.equal(publicationContentKey(draft,null),JSON.stringify({source:draft.source.snapshotHash,kind:draft.kind,slideIndex:draft.slideIndex,caption:draft.caption,altText:draft.altText,accountId:draft.accountId,scheduledAt:draft.scheduledAt,timeZone:draft.timeZone,media:null}));
});

test('finished-file upload has a genuine null project, prepared revision1 and replay protection',async()=>{
 const f=fixture(),input=uploadInput(f),entry=await f.operations.upload(input);assert.equal(entry.status,'manual_planned');assert.equal(entry.revision,1);assert.equal(entry.generation,1);assert.equal(entry.caption,'');assert.equal(entry.scheduledAt,null);assert.equal(entry.approval,null);assert.equal(entry.source.origin,'upload');assert.equal((await f.operations.load(entry.id)).project,null);assert.equal(f.publications.get(entry.id)!.projectSnapshot,null);assert(uploadMediaMatches(entry.source,entry.media));
 assert.deepEqual(await f.operations.upload(input),entry);await assert.rejects(f.operations.upload({...input,requestHash:publishingHash('different bytes')}),PlannerError);assert.equal(f.publications.size,1);
 const loaded=await f.operations.load(entry.id);assert(isUploadedSource(loaded.entry.source));assert(!('projectId'in loaded.entry.source));
});

test('upload caption/time save retains exact owned media and rejects source injection or Studio conversion',async()=>{
 const f=fixture(),entry=await f.operations.upload(uploadInput(f));const draft={...f.draft(),id:entry.id,source:entry.source,caption:'Eigene fertige Caption',scheduledAt:'2026-11-02T09:00:00.000Z',timeZone:'Europe/Paris'};
 const saved=await f.operations.save({idempotencyKey:randomUUID(),baseRevision:1,draft});assert.equal(saved.caption,draft.caption);assert.equal(saved.media?.id,entry.media?.id);assert.equal(saved.status,'prepared');assert.equal((await f.operations.load(entry.id)).project,null);
 await assert.rejects(f.operations.save({idempotencyKey:randomUUID(),baseRevision:0,draft:{...draft,id:randomUUID()}}),/hochladen/);
 await assert.rejects(f.operations.save({idempotencyKey:randomUUID(),baseRevision:saved.revision,draft:{...draft,source:{...draft.source,snapshotHash:'f'.repeat(64)}}}),/hochladen/);
 await assert.rejects(f.operations.save({idempotencyKey:randomUUID(),baseRevision:saved.revision,draft:{...draft,source:f.source}}),/neue Planung/);
 await assert.rejects(f.operations.prepare({...f.action(entry.id),media:entry.media!}),/ersetzen/);
});

test('replacement is a single prepared revision retaining saved metadata and invalidating approval',async()=>{
 const f=fixture(),connection=await f.connect(),entry=await f.operations.upload(uploadInput(f));let saved=await f.operations.save({idempotencyKey:randomUUID(),baseRevision:1,draft:{...f.draft({id:entry.id,accountId:connection.id}),source:entry.source,caption:'Bleibt erhalten'}});saved=await f.operations.approve(f.action(entry.id),'Fixture');
 const input=uploadInput(f,entry.id,saved.revision);input.media.sha256=publishingHash('replacement');input.media.sourceHash=input.media.sha256;const replaced=await f.operations.upload(input);
 assert.equal(replaced.revision,saved.revision+1);assert.equal(replaced.generation,saved.generation+1);assert.equal(replaced.caption,'Bleibt erhalten');assert.equal(replaced.accountId,connection.id);assert.equal(replaced.scheduledAt,saved.scheduledAt);assert.equal(replaced.approval,null);assert.equal(replaced.status,'prepared');assert.equal(f.publications.get(entry.id)!.wake,null);assert.notEqual(replaced.media!.id,entry.media!.id);
 await assert.rejects(f.operations.upload(uploadInput(f,entry.id,1)),PlannerError);
 const studio=await f.prepared();await assert.rejects(f.operations.upload(uploadInput(f,studio.id,studio.revision)),/eigene Upload/);
});

test('upload media cannot cross brand, immutable file identity, snapshot type or final-state boundaries',async()=>{
 const f=fixture(),input=uploadInput(f),entry=await f.operations.upload(input);
 await assert.rejects(f.operations.upload({...uploadInput(f,entry.id,1),request:{...input.request,baseRevision:1,brandKey:'other'}}),PlannerError);
 assert.throws(()=>acceptUploadedPublication(null,{...f.draft(),source:entry.source}, {...entry.media!,id:randomUUID()},'2026-11-02T08:00:00.000Z'));
 const invalid=f.publications.get(entry.id)!;invalid.projectSnapshot=f.project;await assert.rejects(f.operations.load(entry.id),/Datei/);invalid.projectSnapshot=null;
 for(const state of ['published','lease','started']){const row=structuredClone(f.publications.get(entry.id)!);if(state==='published')row.entry.status='published';if(state==='lease')row.entry.lease={token:randomUUID(),until:'2026-11-02T09:00:00.000Z'};if(state==='started')row.entry.process.publishStartedAt='2026-11-02T08:00:00.000Z';f.publications.set(entry.id,row);await assert.rejects(f.operations.upload(uploadInput(f,entry.id,row.entry.revision)));f.publications.set(entry.id,structuredClone({...row,entry}));}
});

test('uploaded media passes the actual scheduler phases without a fake Studio snapshot',async()=>{
 const f=fixture(),connection=await f.connect(),entry=await f.operations.upload(uploadInput(f));await f.operations.save({idempotencyKey:randomUUID(),baseRevision:1,draft:{...f.draft({id:entry.id,accountId:connection.id}),source:entry.source}});await f.operations.approve(f.action(entry.id),'Fixture');await f.next(entry.id);await f.next(entry.id);await f.next(entry.id);assert.equal(f.publications.get(entry.id)!.entry.status,'published');assert.equal(f.calls.publish,1);
});


test('credential renewal pauses a prior approval immediately and stale deliveries never call a provider',async()=>{
 const f=fixture(),entry=await f.approved(),prior=f.connections.get(entry.accountId!)!,wake=f.publications.get(entry.id)!.wake!;
 await f.operations.saveConnection({id:prior.view.id,baseRevision:prior.view.revision,idempotencyKey:randomUUID(),brandKey:'default',label:prior.view.label,accountId:prior.view.accountId,accessToken:'fixture-replacement-token-only',expiresAt:'2027-02-01T00:00:00.000Z',permissionsConfirmed:true});
 assert.equal(f.publications.get(entry.id)!.entry.status,'needs_review');assert.equal(f.publications.get(entry.id)!.entry.approval,null);
 await f.scheduler.tick({publicationId:entry.id,generation:entry.generation,wakeId:wake.id});assert.equal(f.calls.create,0);assert.equal(f.calls.publish,0);
});

test('explicit account rejection updates the connection and pauses approval; a transient check keeps last confirmed status',async()=>{
 const f=fixture(),entry=await f.approved(),prior=f.connections.get(entry.accountId!)!.view;
 f.driver.checkAccount=async()=>{throw new InstagramError('Instagram ist gerade nicht erreichbar.','transient');};
 let checked=await f.operations.checkConnection({id:prior.id,baseRevision:prior.revision,idempotencyKey:randomUUID()});
 assert.equal(checked.status,'connected');assert.equal(checked.generation,prior.generation);assert.equal(checked.checkedAt,prior.checkedAt);assert.equal(f.publications.get(entry.id)!.entry.status,'scheduling');
 f.driver.checkAccount=async()=>{throw new InstagramError('Der Instagram-Zugang ist abgelaufen.','expired');};
 checked=await f.operations.checkConnection({id:prior.id,baseRevision:checked.revision,idempotencyKey:randomUUID()});
 assert.equal(checked.status,'expired');assert.equal(checked.generation,prior.generation+1);assert.equal(f.publications.get(entry.id)!.entry.status,'needs_review');assert.equal(f.publications.get(entry.id)!.entry.approval,null);
});

test('approval rejects a known token expiry before the publication plus its safety buffer',async()=>{
 const f=fixture(),entry=await f.prepared(),connection=f.connections.get(entry.accountId!)!;
 connection.view.expiresAt='2026-11-02T08:40:00.000Z';f.connections.set(connection.view.id,connection);
 await assert.rejects(f.operations.approve(f.action(entry.id),'Fixture owner'),/läuft vor diesem Termin ab/);assert.equal(f.publications.get(entry.id)!.entry.approval,null);
 f.ready.credentials=false;connection.view.expiresAt='2027-02-01T00:00:00.000Z';f.connections.set(connection.view.id,connection);
 await assert.rejects(f.operations.approve(f.action(entry.id),'Fixture owner'),error=>error instanceof PlannerError&&error.status===503);
});

test('manual references save without provider setup and complete, reopen and copy independently',async()=>{
 const {buildReferenceSource}=await import('../src/lib/social/publishing/reference'),f=fixture();f.ready.queue=false;f.ready.media=false;f.ready.publicOrigin=false;
 const source=await buildReferenceSource({title:'Text post',brandKey:'default',brandLabel:brand.name,kind:'note'}),draft=f.draft({source,kind:'text',platform:'bluesky',delivery:'manual',targetLabel:'Own channel',accountId:null}),entry=await f.operations.save({idempotencyKey:randomUUID(),baseRevision:0,draft});
 assert.equal(entry.status,'manual_planned');assert.equal((await f.operations.load(entry.id)).project,null);assert.equal(f.publications.get(entry.id)!.projectSnapshot,null);assert.equal(entry.media,null);
 const complete=f.action(entry.id),completed=await f.operations.complete(complete,'Fixture owner');assert.equal(completed.status,'manual_completed');assert.equal(completed.manualCompletion?.by,'Fixture owner');assert.equal(completed.process.confirmedAt,null);assert.deepEqual(await f.operations.complete(complete,'Fixture owner'),completed);
 await assert.rejects(f.operations.reopen({...f.action(entry.id),baseRevision:1}),PlannerError);
 const reopened=await f.operations.reopen(f.action(entry.id));assert.equal(reopened.status,'manual_planned');assert.equal(reopened.manualCompletion,null);
 const request={...f.action(entry.id),newId:randomUUID(),platform:'linkedin' as const},copy=await f.operations.copy(request);assert.equal(copy.platform,'linkedin');assert.equal(copy.delivery,'manual');assert.equal(copy.accountId,null);assert.equal(copy.scheduledAt,null);assert.equal(copy.approval,null);assert.equal(copy.source.snapshotHash,entry.source.snapshotHash);assert.equal(copy.id,request.newId);assert.deepEqual(await f.operations.copy(request),copy);
 const edited=await f.operations.save({idempotencyKey:randomUUID(),baseRevision:copy.revision,draft:{...draft,id:copy.id,platform:'linkedin',caption:'Independent copy',targetLabel:''}});assert.equal(edited.caption,'Independent copy');assert.equal(f.publications.get(entry.id)!.entry.caption,draft.caption);
 assert.deepEqual(f.calls,{account:0,quota:0,create:0,status:0,publish:0});assert.equal(f.sent.length,0);
});
test('manual reference save rejects forged hashes, brands, URLs, accounts and automatic execution',async()=>{
 const {buildReferenceSource}=await import('../src/lib/social/publishing/reference'),f=fixture(),source=await buildReferenceSource({title:'Original',brandKey:'default',brandLabel:brand.name,kind:'reel',url:'https://example.org/original.mp4'}),draft=f.draft({source,kind:'reel',platform:'youtube',delivery:'manual'});
 for(const patch of [{source:{...source,snapshotHash:'f'.repeat(64)}},{source:{...source,brandKey:'other'}},{source:{...source,url:'javascript:alert(1)'}},{accountId:randomUUID()},{delivery:'automatic' as const}])await assert.rejects(f.operations.save({idempotencyKey:randomUUID(),baseRevision:0,draft:{...draft,id:randomUUID(),...patch}}));
 assert.equal(f.publications.size,0);assert.equal(f.calls.create,0);assert.equal(f.calls.publish,0);
 const connection=await f.connect();f.connections.get(connection.id)!.view.brandKey='other';
 await assert.rejects(f.operations.save({idempotencyKey:randomUUID(),baseRevision:0,draft:f.draft({accountId:connection.id})}),/derselben Marke/);
});
test('foreign or manual forged approvals cannot enqueue, tick, reconcile or reach final publish',async()=>{
 for(const patch of [{delivery:'manual' as const},{platform:'tiktok' as const},{platform:'youtube' as const}]){
  const f=fixture(),entry=await f.approved(),row=f.publications.get(entry.id)!;Object.assign(row.entry,patch);await f.scheduler.dispatch(entry.id);assert.equal(f.sent.length,0);
  await f.scheduler.tick({publicationId:entry.id,generation:entry.generation,wakeId:row.wake!.id});assert.equal(f.calls.quota,0);assert.equal(f.calls.create,0);assert.equal(f.calls.publish,0);
  row.entry.status='needs_review';row.entry.process.containerId='123450001';row.entry.process.publishStartedAt='2026-11-02T08:20:00.000Z';
  await assert.rejects(f.operations.reconcile(f.action(entry.id)),error=>error instanceof PublishingStateError||error instanceof PlannerError&&/Connector/.test(error.message));assert.equal(f.calls.status,0);assert.equal(f.calls.publish,0);
 }
 const f=fixture(),entry=await f.approved();await f.scheduler.dispatch(entry.id);await f.next(entry.id);await f.next(entry.id);
 const prior=f.repo.connection;let checks=0;f.repo.connection=async id=>{checks++;if(checks===3)f.publications.get(entry.id)!.entry.platform='linkedin';return prior(id);};await f.next(entry.id);assert.equal(f.calls.publish,0);
});
test('Studio copies retain the frozen saved project and uploaded sources explicitly require re-upload',async()=>{
 const f=fixture(),entry=await f.prepared(),copy=await f.operations.copy({...f.action(entry.id),newId:randomUUID(),platform:'pinterest'});assert.equal(copy.status,'manual_planned');assert.deepEqual(f.publications.get(copy.id)!.projectSnapshot,f.publications.get(entry.id)!.projectSnapshot);assert.equal(copy.media,null);assert.equal(copy.approval,null);assert.equal(copy.accountId,null);
 const uploaded=await f.operations.upload(uploadInput(f));await assert.rejects(f.operations.copy({...f.action(uploaded.id),newId:randomUUID()}),/erneut hochladen/);
});

test('unconfirmed native follow-up keeps the current Queue delivery retryable',async()=>{
  const f=fixture(),prepared=await f.prepared(),id=prepared.id;
  const row=f.publications.get(id)!;
  const {approveNative}=await import('../src/lib/server/social/connectors/publication-state');
  const native=approveNative({...prepared,connectionMode:'native'},'Fixture owner',1,'2026-11-02T08:00:00.000Z');
  const initial=wakeFor(native)!;
  f.publications.set(id,{...row,entry:native,wake:{...initial,queuedAt:'2026-11-02T08:00:00.000Z',messageId:'first'}});
  f.setTime(initial.at);
  let providerSteps=0,enqueueFails=true;
  const scheduler=createPublishingScheduler({...f.deps,uuid:randomUUID,providerUrl:async()=>'',enqueue:async()=>{
    if(enqueueFails)throw Error('Queue temporarily unavailable');
    return {messageId:'next'};
  },nativeTick:async()=>{
    providerSteps++;
    const current=f.publications.get(id)!;
    const next={...current.entry,status:'processing' as const,nextActionAt:new Date(Date.parse(initial.at)+60000).toISOString()};
    f.publications.set(id,{...current,entry:next,wake:wakeFor(next)});
    await scheduler.dispatch(id);
  }});
  const message={publicationId:id,generation:native.generation,wakeId:initial.id};
  await assert.rejects(scheduler.tick(message),/nächste Warteschlangenschritt/);
  enqueueFails=false;
  await scheduler.tick(message);
  assert.equal(providerSteps,1);
  assert.equal(f.publications.get(id)?.wake?.messageId,'next');
});

test('overdue confirmed Queue messages receive a new persisted recovery key',async()=>{
  const f=fixture(),entry=await f.approved(),wake=f.publications.get(entry.id)!.wake!;
  const before=f.queueKeys.at(-1);
  f.setTime(new Date(Date.parse(wake.at)+6*60000).toISOString());
  f.setQueueFailure(true);
  await f.scheduler.recover();
  const retry=f.queueKeys.at(-1);
  assert.notEqual(retry,before);
  f.setQueueFailure(false);
  await f.scheduler.recover();
  assert.equal(f.queueKeys.at(-1),retry);
  assert(f.publications.get(entry.id)?.wake?.queuedAt);
});
