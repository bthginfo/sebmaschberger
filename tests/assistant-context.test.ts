import test from 'node:test';
import assert from 'node:assert/strict';
import {assistantPagePlanSchema,assistantProposalSchema,assistantRequestSchema,mockAssistantProposal} from '../src/lib/assistant/model';

const context={brandName:'Beispielbetrieb',heading:'Möbel nach Maß',addressing:'sie' as const,text:'Wir möchten Ihnen einen Überblick über unsere Leistungen geben. Wir planen, fertigen und montieren Möbel nach Maß. Bei Fragen können Sie gerne Kontakt mit uns aufnehmen.'};

test('prepared demo rewrites the selected example and reuses its actual facts for posts and ideas',()=>{
 const before=structuredClone(context),request={kind:'rewrite' as const,prompt:'Bitte kurz und klar.',context};
 const result=mockAssistantProposal(request);assert.equal(result.kind,'rewrite');if(result.kind!=='rewrite')throw Error('wrong kind');
 assert.notEqual(result.text,context.text);assert.match(result.text,/Möbel nach Maß/);assert.match(result.text,/geplant, gefertigt und montiert/);
 const post=mockAssistantProposal({...request,kind:'social'});if(post.kind!=='social')throw Error('wrong kind');assert.match(post.social.caption,/Beispielbetrieb/);assert.match(post.social.caption,/Möbel nach Maß/);assert(!/www\.|https?:|€|Freitag/.test(post.social.caption));
 const ideas=mockAssistantProposal({...request,kind:'ideas'});if(ideas.kind!=='ideas')throw Error('wrong kind');assert(ideas.ideas.every(value=>value.includes(context.heading)));assert.deepEqual(context,before);
});

test('page example honors available section types and used addresses without inventing links or media',()=>{
 const request={kind:'page' as const,prompt:'Neue Seite',context:{...context,heading:'Angebot',availableSections:[{type:'statement',label:'Aussage'}],pageList:[{title:'Vorhanden',slug:'angebot'}]}};
 const result=mockAssistantProposal(request);assert(assistantProposalSchema.safeParse(result).success);if(result.kind!=='page')throw Error('wrong kind');assert.equal(result.page.slug,'angebot-2');assert.deepEqual(result.page.sections.map(value=>value.type),['statement']);assert(!JSON.stringify(result.page).includes('href'));
 assert.throws(()=>mockAssistantProposal({...request,context:{...request.context,availableSections:[]}}));
});

test('new assistant context is bounded and page plans cannot inject reserved routes, HTML or side effects',()=>{
 assert(!assistantRequestSchema.safeParse({kind:'rewrite',prompt:'Kürzen',context:{brandName:'Test'}}).success);
 assert(!assistantRequestSchema.safeParse({kind:'help',prompt:'Hilfe',context:{...context,apiKey:'forbidden'}}).success);
 const plan={title:'Angebot',slug:'angebot',description:'Unser Angebot',sections:[{type:'richtext',heading:'Angebot',text:'Eigene Angaben'}]};
 assert(assistantPagePlanSchema.safeParse(plan).success);
 for(const slug of ['admin','api/x','checkout','https://outside.invalid'])assert(!assistantPagePlanSchema.safeParse({...plan,slug}).success);
 assert(!assistantPagePlanSchema.safeParse({...plan,publish:true}).success);
 assert(!assistantPagePlanSchema.safeParse({...plan,sections:[{...plan.sections[0],text:'<script>bad()</script>'}]}).success);
});

test('public help cannot present real inquiry, shop or account access',()=>{
 for(const helpTopic of ['cms','inquiries','shop','social'] as const){
  const proposal=mockAssistantProposal({kind:'help',prompt:'Hilfe',context:{...context,helpTopic}});assert(assistantProposalSchema.safeParse(proposal).success);if(proposal.kind!=='help')throw Error('wrong kind');assert.match(proposal.summary,/ohne Zugriff auf echte/);assert(proposal.actions.length>0);assert(!('href'in proposal.actions[0]));
 }
});
