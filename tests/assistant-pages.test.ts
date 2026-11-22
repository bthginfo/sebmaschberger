import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {applyAssistantPagePlan,assistantPageAddressIssue,assistantSectionCatalog} from '../src/lib/assistant/pages';
import {assistantProposalSchema,type AssistantPagePlan,type AssistantRequest} from '../src/lib/assistant/model';
import {assistantTaskInstructions,generateAssistantProposal,AssistantServiceError} from '../src/lib/server/assistant/operations';
import {guidedAssistantHelp} from '../src/lib/server/assistant/help';
import {MockLanguageModelV4} from 'ai/test';
import type {WebsiteContent} from '../src/lib/types';

const base=()=>JSON.parse(readFileSync(new URL('../src/data/content.json',import.meta.url),'utf8')) as WebsiteContent;
const plan:AssistantPagePlan={title:'Eigene Leistungen',slug:'eigene-leistungen',description:'Ein neuer Entwurf mit eigenen Angaben.',sections:[{type:'hero',heading:'Ein eigener Einstieg',text:'Ein sachlicher eigener Text.',items:[]},{type:'richtext',heading:'Leistungen im Detail',text:'Hier stehen geprüfte Angaben.',items:[]},{type:'cta',heading:'Kontakt aufnehmen',text:'Der Kontakt wird anschließend im CMS ergänzt.',items:[]}]};
function fixture(value:unknown,onCall?:(input:unknown)=>void){return new MockLanguageModelV4({doGenerate:async input=>{onCall?.(input);return{content:[{type:'text' as const,text:JSON.stringify(value)}],finishReason:{unified:'stop' as const,raw:undefined},usage:{inputTokens:{total:10,noCache:10,cacheRead:undefined,cacheWrite:undefined},outputTokens:{total:20,text:20,reasoning:undefined}},warnings:[]};}});}

test('reviewed page plan produces one immutable editable draft with real unique section IDs and no sample media or links',()=>{
 const original=base(),before=structuredClone(original),result=applyAssistantPagePlan(original,plan,'same-draft','same-draft');
 assert.deepEqual(original,before);assert.equal(result.content.pages.length,original.pages.length+1);assert.deepEqual(result.content.config,original.config);assert.deepEqual(result.content.pages.slice(0,-1),original.pages);
 assert.equal(result.page.slug,plan.slug);assert.equal(result.page.sections.length,3);assert.equal(result.page.seo.description,plan.description);
 assert.equal(new Set(result.page.sections.map(section=>section.id)).size,3);assert(!original.pages.some(page=>page.id===result.page.id));
 for(const section of result.page.sections){assert(!section.content.image);assert(!section.content.images);assert(!section.content.primaryHref);assert(!section.content.secondaryHref);assert.deepEqual(section.content.items,[]);}
 assert.notEqual(applyAssistantPagePlan(original,plan,'same-draft','same-draft').page.id,result.page.id);
});

test('stale draft, unavailable sections, technical routes and duplicate/blog addresses cannot be applied',()=>{
 const original=base();original.config.modules={...original.config.modules,creator:{enabled:false,surface:'profile',demoBasePath:'/demo/example'}};
 assert.throws(()=>applyAssistantPagePlan(original,plan,'old-draft','new-draft'),/inzwischen geändert/);
 assert.throws(()=>applyAssistantPagePlan(original,{...plan,sections:[{type:'creator-shop',heading:'Nicht erlaubt',text:''}]},'draft','draft'),/nicht verfügbar/);
 assert(!assistantSectionCatalog(original).some(section=>section.type.startsWith('creator-')));
 for(const slug of ['admin/private','api','checkout/ergebnis','studio-embed','demo/example'])assert(assistantPageAddressIssue(original,slug));
 assert.throws(()=>applyAssistantPagePlan(original,{...plan,slug:original.pages[0].slug||'api'},'draft','draft'));
 original.config.blog={enabled:true,title:'Blog',description:'',slug:'wissen',layout:'cards',showInNavigation:false,navLabel:'Blog'};
 assert(assistantPageAddressIssue(original,'wissen'));assert(assistantPageAddressIssue(original,'wissen/kuenftiger-beitrag'));
 assert.throws(()=>applyAssistantPagePlan(original,{...plan,slug:'wissen/beitrag'},'draft','draft'),/Blog/);
});

test('page model sees only catalog/source context and rejects unavailable or already-used generated sections/routes',async()=>{
 const request:AssistantRequest={kind:'page',prompt:'Eine sachliche neue Seite.',context:{brandName:'Eigene Marke',addressing:'du',voice:'Konkret und freundlich.',audience:'Kleine Betriebe',draftToken:'private-browser-marker',availableSections:[{type:'hero',label:'Auftakt'},{type:'richtext',label:'Text'},{type:'cta',label:'Kontakt'}],pageList:[{title:'Vorhanden',slug:'vorhanden'}]}};
 const proposal={kind:'page' as const,title:'Ein eigener Aufbau',summary:'Vor der Übernahme prüfen.',page:plan};
 let calls=0;const model=fixture({proposal},input=>{calls++;const serialized=JSON.stringify(input);assert(!serialized.includes('private-browser-marker'));assert(serialized.includes('Sprechen Sie die Person mit du an.'));assert(serialized.includes('availableSections'));const messages=(input as {prompt:{role:string;content:unknown}[]}).prompt;const system=JSON.stringify(messages.filter(message=>message.role==='system')),user=JSON.stringify(messages.filter(message=>message.role==='user'));assert(!system.includes('Kleine Betriebe'));assert(!system.includes('Konkret und freundlich.'));assert(user.includes('Kleine Betriebe'));assert(user.includes('Konkret und freundlich.'));});
 assert.deepEqual(await generateAssistantProposal(request,model),proposal);assert.equal(calls,1);
 await assert.rejects(()=>generateAssistantProposal(request,fixture({proposal:{...proposal,page:{...plan,sections:[{type:'unknown-section',heading:'Unbekannt',text:'',items:[]}]}}})),error=>error instanceof AssistantServiceError&&error.status===502);
 await assert.rejects(()=>generateAssistantProposal(request,fixture({proposal:{...proposal,page:{...plan,slug:'vorhanden'}}})),/bereits vergeben/);
 await assert.rejects(()=>generateAssistantProposal({...request,context:{brandName:'Eigene Marke'}},model),/Abschnittsbibliothek/);assert.equal(calls,1);
 assert(assistantTaskInstructions(request).includes('source.availableSections'));assert(!assistantTaskInstructions(request).includes('Kleine Betriebe'));assert(!assistantTaskInstructions(request).includes('Konkret und freundlich.'));
});

test('CMS help reports saved counts without pretending a live provider or exposing private data',()=>{
 const request:AssistantRequest={kind:'help',prompt:'Welche Anfragen sind da?',context:{brandName:'Eigene Marke'}};
 const inquiries=guidedAssistantHelp(request,{inquiries:{total:7,new:2,inProgress:3,done:1,spam:1}});assert.equal(inquiries.kind,'help');assert(inquiries.answer.includes('7 Anfragen'));assert(inquiries.answer.includes('2 neu'));assert.deepEqual(inquiries.actions,[{id:'inquiries',label:'Anfragen öffnen'}]);assert(assistantProposalSchema.safeParse(inquiries).success);
 const missing=guidedAssistantHelp({...request,context:{...request.context,helpTopic:'social'}},{social:{available:false,studioEnabled:false,plannerEnabled:false,storedConnected:0,storedExpired:0}});assert(missing.answer.includes('noch keinen eigenen Post-Planer'));assert.equal(missing.actions[0].id,'settings');
 const social=guidedAssistantHelp({...request,context:{...request.context,helpTopic:'social'}},{social:{available:true,studioEnabled:true,plannerEnabled:true,storedConnected:1,storedExpired:2}});assert(social.answer.includes('keine neue Live-Prüfung'));assert(social.answer.includes('TikTok'));assert.equal(social.actions[0].id,'social');
 const shop=guidedAssistantHelp({...request,context:{...request.context,helpTopic:'shop'}},{shop:{enabled:true,products:4,activeProducts:2,orders:5,unfulfilledPaid:1,paymentCredentials:true,paymentsEnabled:false}});assert(shop.answer.includes('noch keine erfolgreiche Anbieterprüfung'));assert(shop.answer.includes('Zahlungsschalter ist aus'));assert(assistantProposalSchema.safeParse(shop).success);
});

test('native CMS help never calls a model as a fallback',async()=>{
 let calls=0;await assert.rejects(()=>generateAssistantProposal({kind:'help',prompt:'CMS erklären',context:{brandName:'Eigene Marke'}},fixture({},()=>{calls++;})),/direkt aus dem gespeicherten/);assert.equal(calls,0);
});
