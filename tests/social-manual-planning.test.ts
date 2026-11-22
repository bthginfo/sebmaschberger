import test from 'node:test';
import {equal,ok,throws} from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {PLATFORM_IDS,effectiveDelivery,effectivePlatform,isAutomaticInstagram,isReferenceSource,publicationRecordSchema,type PublicationDraft} from '../src/lib/social/publishing/model';
import {newPublication,savePublication,approvePublication,completeManualPublication,reopenManualPublication,publicationContentKey} from '../src/lib/social/publishing/state';
import {buildReferenceSource,referenceContentKey} from '../src/lib/social/publishing/reference';
import {plannerText,plannerCsv,plannerIcs,plannerExport,csvCell} from '../src/lib/social/publishing/export';
const at='2026-11-01T10:00:00.000Z';
function studioDraft():PublicationDraft{return{id:randomUUID(),source:{projectId:'fixture',projectRevision:1,title:'Original',brandKey:'default',brandLabel:'Example',formatId:'portrait',kind:'post',slides:1,snapshotHash:'a'.repeat(64)},kind:'image',slideIndex:0,caption:'Planner caption',altText:'Description',accountId:null,scheduledAt:'2026-11-02T08:00:00.000Z',timeZone:'Europe/Berlin'};}
test('new plans are manual across eight channels; completion is separate from provider confirmation',()=>{
 for(const platform of PLATFORM_IDS){
  const draft={...studioDraft(),platform,delivery:'manual' as const,targetLabel:'Own channel'},entry=newPublication(draft,at);
  equal(entry.status,'manual_planned');equal(entry.approval,null);equal(entry.nextActionAt,null);
  const completed=completeManualPublication(entry,'fixture-owner',at);equal(completed.status,'manual_completed');equal(completed.manualCompletion?.by,'fixture-owner');equal(completed.process.confirmedAt,null);equal(completed.process.mediaId,null);
  const reopened=reopenManualPublication(completed,at);equal(reopened.status,'manual_planned');equal(reopened.manualCompletion,null);
  const edited=savePublication(completed,{...draft,caption:'Changed'},at);equal(edited.status,'manual_planned');equal(edited.manualCompletion,null);
  throws(()=>approvePublication(entry,{by:'fixture',contentHash:'b'.repeat(64),connectionGeneration:1},at));
 }
 const fresh=newPublication(studioDraft(),at);equal(effectiveDelivery(fresh),'manual');equal(effectivePlatform(fresh),'instagram');
 equal(newPublication({...studioDraft(),platform:'linkedin',delivery:'automatic'},at).status,'draft');
 throws(()=>newPublication({...studioDraft(),platform:'tiktok',delivery:'automatic'},at));
 throws(()=>newPublication({...studioDraft(),delivery:'manual',accountId:randomUUID()},at));
});
test('legacy saved plans retain absent fields and the exact historical content key',()=>{
 const draft=studioDraft(),fresh=newPublication({...draft,platform:'instagram',delivery:'automatic'},at),{platform,delivery,targetLabel,manualCompletion,...legacy}=fresh,parsed=publicationRecordSchema.parse(legacy);
 equal(effectivePlatform(parsed),'instagram');equal(effectiveDelivery(parsed),'automatic');equal(isAutomaticInstagram(parsed),true);equal('platform'in parsed,false);equal('delivery'in parsed,false);
 equal(publicationContentKey(parsed,null),JSON.stringify({source:draft.source.snapshotHash,kind:draft.kind,slideIndex:draft.slideIndex,caption:draft.caption,altText:draft.altText,accountId:draft.accountId,scheduledAt:draft.scheduledAt,timeZone:draft.timeZone,media:null}));
 ok(publicationContentKey({...parsed,platform:'instagram',delivery:'manual'},null)!==publicationContentKey(parsed,null));
});
test('reference sources are canonical inert notes or HTTPS originals with a verifiable hash',async()=>{
 const note=await buildReferenceSource({title:'  Text plan  ',brandKey:'default',brandLabel:'Example',kind:'note'});equal(note.title,'Text plan');equal(note.url,null);equal(note.snapshotHash,createHash('sha256').update(referenceContentKey(note)).digest('hex'));equal(isReferenceSource(note),true);
 const entry=newPublication({...studioDraft(),source:note,kind:'text',delivery:'manual'},at);equal(entry.media,null);equal(entry.status,'manual_planned');
 const media=await buildReferenceSource({title:'Long video',brandKey:'default',brandLabel:'Example',kind:'reel',url:'HTTPS://EXAMPLE.ORG:443/video?take=2'});equal(media.url,'https://example.org/video?take=2');
 for(const url of ['http://example.org/a','javascript:alert(1)','https://user:password@example.org/a','https://localhost/a','https://127.0.0.1/a','https://2130706433/a','https://[::1]/a','https://studio.local/a','https://example.org/a\nInjected'])throws(()=>referenceContentKey({title:'Bad',brandKey:'default',brandLabel:'Example',kind:'post',url}));
 throws(()=>newPublication({...studioDraft(),source:note,kind:'image',delivery:'manual'},at));
 throws(()=>newPublication({...studioDraft(),source:note,kind:'text',delivery:'automatic'},at));
});
test('exports preserve planner values and escape CSV formulas and calendar content',()=>{
 const entry=newPublication({...studioDraft(),delivery:'manual',platform:'linkedin',targetLabel:'Own page',caption:'=1+1\nBEGIN:VEVENT\nUnicode ä,;\\ end'},at),undated=newPublication({...studioDraft(),delivery:'manual',scheduledAt:null},at);
 ok(plannerText(entry).includes(entry.caption));ok(plannerText(entry).includes('Own page'));
 const csv=plannerCsv([entry]);ok(csv.includes('"\'=1+1'));equal(csvCell('  @SUM(1,2)'),'"\'  @SUM(1,2)"');equal(csvCell('a"b'),'"a""b"');
 const rawCalendar=plannerIcs([entry,undated]),calendar=rawCalendar.replace(/\r\n /g,'');equal(rawCalendar,plannerIcs([entry,undated]));equal((calendar.match(/\r\nBEGIN:VEVENT\r\n/g)||[]).length,1);ok(calendar.includes('DTSTART:20261102T080000Z'));ok(calendar.includes('UID:'+entry.id+'@social-planner.invalid'));ok(calendar.includes('\\nBEGIN:VEVENT\\n'));ok(calendar.includes('Unicode ä\\,\\;\\\\ end'));
 const unicode=plannerIcs([{...entry,caption:'🟠'.repeat(100)}]);for(const line of unicode.split('\r\n'))ok(Buffer.byteLength(line,'utf8')<=75);
 equal(plannerExport([entry],'ics').mimeType,'text/calendar;charset=utf-8');
});

