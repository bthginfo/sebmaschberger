import assert from 'node:assert/strict';
import test from 'node:test';
import seed from './fixtures/starter-content.json';
import { safeBackupSnapshot, sealArchive, openArchive, sha256 } from '../scripts/lib/backup-format';
import { currentAdminSession } from '../src/lib/auth-session';
import { canUseAdminAction } from '../src/lib/team/permissions';
import { outcomeProof, readOutcomeProof } from '../src/lib/server/analytics/outcome-proof';
import { adminInquiry } from '../src/lib/inquiry-view';
import { createAnalyticsService, type AnalyticsRepository } from '../src/lib/server/analytics/service';
import { defaultAnalyticsFilters, type AnalyticsSession, type AnalyticsSettings } from '../src/lib/analytics/model';

const now = new Date('2026-11-05T15:30:00.000Z');
const key = 'isolated-test-key-for-outcomes-00000000';

test('staff sessions are fail-closed and cannot use owner-only admin actions',()=>{
  const session={id:'internal',createdAt:now.toISOString(),expiresAt:'2026-11-06T00:00:00.000Z',credentialVersion:'assigned',accountId:'editor'};
  const credentials={changedAt:now.toISOString(),version:'assigned',enabled:true,role:'editor' as const};
  assert(currentAdminSession(session,credentials,now.getTime()));
  assert(!currentAdminSession(session,{...credentials,enabled:false},now.getTime()));
  assert(!currentAdminSession(session,{...credentials,version:'reset'},now.getTime()));
  assert(!currentAdminSession(session,{changedAt:now.toISOString(),version:'assigned'},now.getTime()));
  assert(canUseAdminAction('editor','content','PUT'));
  for(const [action,method] of [['publish','POST'],['settings','PUT'],['media','DELETE'],['export','GET'],['team','GET'],['inquiries','GET']])assert(!canUseAdminAction('editor',action,method));
  assert(canUseAdminAction('shop','bootstrap','GET'));
  assert(!canUseAdminAction('shop','content','PUT'));
});

test('encrypted recovery retains business records and excludes live access capabilities',()=>{
  const snapshot=safeBackupSnapshot({state:{draft:seed,published:seed,revision:1,updatedAt:now.toISOString(),publishedAt:null,revisions:[]},records:{
    'auth:admin':{hash:'private'},'sessions:sample':{token:'private'},'staff-accounts:editor':{hash:'private'},
    'social-publications:test':{approval:'private'},'settings:site':{smtp:{enabled:true,password:'private'},retentionDays:120},
    'inquiries:one':{email:'test@example.invalid',proposal:{status:'offered',tokenHash:'private'},submissionHash:'private'},
    'reservations-by-date:2026-11-13':[{ email:'table@example.invalid', status:'confirmed', delivery:{status:'sending'} }],
    'commerce:state':{orders:[{checkoutUrl:'private',checkoutRequest:'private',requestKey:'private',mail:{status:'sending',leaseId:'private'},totalCents:1000}],events:{}}
  }});
  const pass='isolated backup passphrase for tests';
  const bytes=Buffer.from('fixture');
  const sealed=sealArchive({version:1,createdAt:now.toISOString(),commit:'a'.repeat(40),project:'fixture',snapshot,
    files:[{url:'/media/local.png',visibility:'public',extension:'png',sha:sha256(bytes),bytes:bytes.toString('base64')}]},pass);
  assert(!sealed.includes(Buffer.from('test@example.invalid')));
  assert.throws(()=>openArchive(sealed,'different isolated passphrase'),/Passphrase oder Integrität/);
  const altered=Buffer.from(sealed);altered[altered.length-1]^=1;
  assert.throws(()=>openArchive(altered,pass),/Passphrase oder Integrität/);
  const restored=openArchive(sealed,pass);
  const raw=JSON.stringify(restored.snapshot.records);
  assert(!raw.includes('private'));
  assert(!raw.includes('staff-accounts'));
  assert(!raw.includes('social-publications'));
  assert(raw.includes('revoked'));
  assert(raw.includes('1000'));
  assert.deepEqual(restored.snapshot.records['reservations-by-date:2026-11-13'], { bookings: [{ email:'table@example.invalid', status:'confirmed', delivery:{status:'failed'} }] });
});

test('signed analytics outcomes require a matching consenting visit and deduplicate retries',async()=>{
  let settings:AnalyticsSettings|null=null;
  const sessions=new Map<string,AnalyticsSession>();
  const repository:AnalyticsRepository={
    readSettings:async()=>settings,
    mutateSettings:async update=>(settings=update(settings)),
    mutateSession:async(id,_settings,update)=>{sessions.set(id,update(sessions.get(id)??null));},
    sessions:async()=>[...sessions.values()], cleanup:async()=>{},clear:async()=>sessions.clear()
  };
  const service=createAnalyticsService(repository,()=>now);
  const initial=await service.admin();
  const ready=await service.configure({baseRevision:initial.revision,enabled:true,retentionDays:90,goals:[]});
  const session=await service.consent({visitor:'11111111-1111-4111-8111-111111111111',session:'22222222-2222-4222-8222-222222222222',generation:ready.generation,policy:'first-party-v1'});
  const pageId='33333333-3333-4333-8333-333333333333';
  const proof=outcomeProof('purchase','private-order-ref',now.toISOString(),key,now.getTime())!;
  const outcome=readOutcomeProof(proof,key,now.getTime())!;
  assert(outcome);
  assert(!JSON.stringify(outcome).includes('private-order-ref'));
  assert.equal(readOutcomeProof(proof,key,now.getTime()+31*60000),null);
  await assert.rejects(service.recordOutcome(session.token,pageId,outcome),/zugehöriger Seitenaufruf/);
  await service.ingest({token:session.token,pageId,path:'/leistungen',source:'newsletter',campaign:'November',engagedMs:0},{userAgent:'Chrome/140',country:'DE'});
  await assert.rejects(service.recordOutcome('invalid',pageId,outcome),/Einwilligung/);
  await service.recordOutcome(session.token,pageId,outcome);
  await service.recordOutcome(session.token,pageId,outcome);
  const report=await service.report({...defaultAnalyticsFilters(now),source:'newsletter'});
  assert.equal(report.outcomes.find(result=>result.kind==='purchase')?.count,1);
  assert.deepEqual(report.outcomes.find(result=>result.kind==='purchase')?.campaigns,[{name:'November',value:1}]);
});

test('inbox projections never expose an approval link hash or receipt lease',()=>{
  const record={id:'test',name:'Test',email:'test@example.invalid',phone:'',subject:'Test',message:'Test',createdAt:now.toISOString(),status:'new' as const,note:'',emailStatus:'not-configured' as const,submissionHash:'private',receiptLease:{id:'private'},proposal:{revision:1,kind:'offer' as const,status:'offered' as const,title:'Test',description:'Test',createdAt:now.toISOString(),expiresAt:now.toISOString(),tokenHash:'private'}};
  const view=adminInquiry(record);
  assert.equal(view.proposal?.status,'offered');
  assert(!JSON.stringify(view).includes('private'));
});
