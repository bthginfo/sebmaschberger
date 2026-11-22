import test from 'node:test';
import assert from 'node:assert/strict';
import type {PublicationRecord} from '../src/lib/social/publishing/model';
import {calendarDays,moveCalendar,calendarToday,publicationDay,publicationTime,presentation,plannerMatches,plannerCounts,coverMedia,undatedPlannerGroups} from '../src/lib/social/publishing/planner-view';

const fixture=(changes:Partial<PublicationRecord>={}):PublicationRecord=>({
 id:'00000000-0000-4000-8000-000000000001',source:{origin:'studio',projectId:'generic-design',projectRevision:1,title:'Ein guter Beitrag',brandKey:'default',brandLabel:'Meine Marke',formatId:'portrait',kind:'post',slides:3,snapshotHash:'a'.repeat(64)},kind:'image',slideIndex:0,caption:'Ein verständlicher Text.',altText:'',accountId:null,scheduledAt:'2026-11-03T17:00:00.000Z',timeZone:'Europe/Berlin',platform:'instagram',delivery:'manual',revision:1,status:'draft',generation:1,media:null,approval:null,process:{phase:'idle',containerId:null,containerCreatedAt:null,polls:0,publishStartedAt:null,mediaId:null,confirmedAt:null,lastError:null},nextActionAt:null,lease:null,createdAt:'2026-11-01T12:00:00.000Z',updatedAt:'2026-11-01T12:00:00.000Z',...changes
});
test('weeks begin on Monday and retain all seven dates',()=>{
 assert.deepEqual(calendarDays('2026-11-03','week'),['2026-11-02','2026-11-03','2026-11-04','2026-11-05','2026-11-06','2026-11-07','2026-11-08']);
});
test('calendar arithmetic survives year boundaries and DST',()=>{
 assert.equal(moveCalendar('2026-12-29',1,'week'),'2027-01-05');
 assert.deepEqual(calendarDays('2026-03-29','week'),['2026-03-23','2026-03-24','2026-03-25','2026-03-26','2026-03-27','2026-03-28','2026-03-29']);
 assert.equal(moveCalendar('2026-12-31',1,'month'),'2027-01-01');
});
test('month includes complete adjacent weeks without losing dates',()=>{
 const dates=calendarDays('2026-11-03','month');
 assert.equal(dates.length,42);assert.equal(dates[0],'2026-10-26');assert.equal(dates[41],'2026-12-06');
 assert.equal(new Set(dates).size,42);
});
test('publication days and times use the chosen zone, including midnight',()=>{
 const entry=fixture({scheduledAt:'2026-10-25T23:30:00.000Z'});
 assert.equal(publicationDay(entry,'Europe/Berlin'),'2026-10-26');
 assert.equal(publicationTime(entry,'Europe/Berlin'),'00:30');
 assert.equal(publicationDay(entry,'America/New_York'),'2026-10-25');
 assert.equal(calendarToday('Europe/Berlin',new Date('2026-11-03T23:30:00Z')),'2026-11-04');
});
test('approved future outbox remains approved rather than claiming a queue receipt',()=>{
 const entry=fixture({status:'scheduling',approval:{by:'owner',at:'2026-11-01T12:00:00Z',contentHash:'a'.repeat(64),mediaHash:'b'.repeat(64),connectionGeneration:1}});
 assert.equal(presentation(entry).label,'Freigegeben');assert.equal(presentation(entry).scope,'planned');
 assert.equal(entry.status,'scheduling');
 const unapproved=fixture({status:'scheduling'});assert.notEqual(presentation(unapproved).scope,'planned');
});
test('provider errors and TikTok handoffs remain visible for review',()=>{
 assert.equal(presentation(fixture({status:'scheduled',process:{...fixture().process,lastError:'Provider temporarily unavailable'}})).label,'Prüfen');
 assert.equal(presentation(fixture({status:'awaiting_platform'})).scope,'attention');
 assert.notEqual(presentation(fixture({status:'manual_completed'})).label,'Veröffentlicht');
});
test('search and status filters combine without changing saved records',()=>{
 const entry=fixture();const before=JSON.stringify(entry);
 assert.equal(plannerMatches(entry,'VERSTÄNDLICHER','drafts'),true);
 assert.equal(plannerMatches(entry,'Ein guter','planned'),false);
 assert.equal(plannerMatches(entry,'nicht vorhanden','all'),false);
 assert.equal(JSON.stringify(entry),before);
});
test('counts respect real state and preserve manual completion distinctions',()=>{
 const result=plannerCounts([fixture(),fixture({status:'prepared'}),fixture({status:'scheduled'}),fixture({status:'manual_planned'}),fixture({status:'manual_completed'}),fixture({status:'published'}),fixture({status:'failed'}),fixture({status:'cancelled'})]);
 assert.deepEqual(result,{all:8,planned:2,drafts:2,attention:1,done:2});
});
test('carousel covers select the first slide even when media arrive out of order',()=>{
 const media=(id:string,slideIndex:number)=>({id,slideIndex,sha256:'b'.repeat(64),sourceHash:'a'.repeat(64),kind:'image' as const,mimeType:'image/jpeg' as const,width:1080,height:1350,bytes:1200,createdAt:'2026-11-01T12:00:00Z'});
 const first=media('first',0),second=media('second',1),entry=fixture({carousel:true,media:second,mediaItems:[second,first]});
 assert.equal(coverMedia(entry)?.id,'first');assert.equal(coverMedia(fixture({media:second}))?.id,'second');
});
test('invalid calendar dates cannot silently roll into another month',()=>{
 assert.throws(()=>calendarDays('2026-02-31','week'));assert.throws(()=>calendarDays('not-a-date','month'));
});

test('undated history stays separate while failed and review-needed work remains visible',()=>{
 const records=['draft','failed','needs_review','published','manual_completed','cancelled'].map((status,index)=>fixture({id:String(index),status:status as PublicationRecord['status'],scheduledAt:null}));
 const snapshot=JSON.stringify(records),groups=undatedPlannerGroups(records);
 assert.deepEqual(groups.active.map(item=>item.status),['draft','failed','needs_review']);
 assert.deepEqual(groups.closed.map(item=>item.status),['published','manual_completed','cancelled']);
 assert.equal(groups.active.length+groups.closed.length,records.length);
 assert.equal(JSON.stringify(records),snapshot);
 assert.deepEqual(undatedPlannerGroups([fixture({status:'published'})]),{active:[],closed:[]});
});
test('history respects existing filters and never conceals a stored error',()=>{
 const published=fixture({status:'published',scheduledAt:null}),cancelled=fixture({status:'cancelled',scheduledAt:null}),failed=fixture({status:'failed',scheduledAt:null});
 const done=[published,cancelled,failed].filter(item=>plannerMatches(item,'','done'));
 assert.deepEqual(undatedPlannerGroups(done).closed,[published]);
 const withError=fixture({status:'published',scheduledAt:null,process:{...published.process,lastError:'Prüfung erforderlich'}});
 assert.deepEqual(undatedPlannerGroups([withError]).active,[withError]);
 assert.equal(plannerCounts([published,cancelled,failed]).all,3);
});
