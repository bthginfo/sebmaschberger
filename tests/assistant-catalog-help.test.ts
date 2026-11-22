import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {allowedAssistantSectionCatalog} from '../src/lib/assistant/catalog';
import {applyAssistantPagePlan} from '../src/lib/assistant/pages';
import {assistantProposalSchema,type AssistantPagePlan,type AssistantRequest} from '../src/lib/assistant/model';
import {assistantHelpTopic,guidedAssistantHelp,summarizeAssistantInquiries} from '../src/lib/server/assistant/help';
import type {WebsiteContent} from '../src/lib/types';

test('page plans exclude configured modules and media that heading/text cannot faithfully create, and reject invisible list entries',()=>{
 const site=JSON.parse(readFileSync(new URL('../src/data/content.json',import.meta.url),'utf8')) as WebsiteContent;
 site.config.modules={...site.config.modules,creator:{enabled:true,surface:'profile',demoBasePath:'/demo/example'}};
 const available=allowedAssistantSectionCatalog(site.config).map(section=>section.type);
 assert(available.includes('hero'));assert(available.includes('richtext'));assert(available.includes('faq'));
 for(const type of ['video','map','contact','gallery','divider','creator-demo','creator-shop','creator-social','assistant-showcase'])assert(!available.includes(type as typeof available[number]),type);
 const plan:AssistantPagePlan={title:'Eigene Seite',slug:'eigener-seitenplan',description:'Eigene Angaben',sections:[{type:'hero',heading:'Einstieg',text:'Eigener Text',items:[{title:'Unsichtbare Liste',text:'Soll nicht verloren gehen.'}]}]};
 assert.throws(()=>applyAssistantPagePlan(site,plan,'draft','draft'),/Listeneinträge/);
 for(const type of ['video','creator-shop','assistant-showcase'])assert.throws(()=>applyAssistantPagePlan(site,{...plan,sections:[{type,heading:'Nicht geeignet',text:'Eigene Angaben'}]},'draft','draft'),/nicht verfügbar/);
 const result=applyAssistantPagePlan(site,{...plan,sections:[{type:'richtext',heading:'Sichtbare Inhalte',text:'Eigener Text',items:[{title:'Eigener Eintrag',text:'Bleibt als bearbeitbarer Inhalt erhalten.'}]}]},'draft','draft');
 assert.equal(result.page.sections[0].content.items?.[0].text,'Bleibt als bearbeitbarer Inhalt erhalten.');
});

test('native inquiry overview exposes only five sanitized subject/status pairs and no contact/body fields',()=>{
 const inquiries=Array.from({length:7},(_,index)=>({subject:index===6?'<b>Angebot</b> für mail@example.org '+('x'.repeat(200)):'Projekt '+index,status:index===6?'new':'done',createdAt:`2026-11-${String(index+1).padStart(2,'0')}T12:00:00Z`,name:'Private sender',email:'sender@example.org',message:'Private body',note:'Private note'}));
 const summary=summarizeAssistantInquiries(inquiries);assert.equal(summary.total,7);assert.equal(summary.recent?.length,5);assert.equal(summary.recent?.[0].status,'Neu');
 for(const item of summary.recent??[]){assert.deepEqual(Object.keys(item).sort(),['status','subject']);assert(item.subject.length<=140);assert(!/[<>]/.test(item.subject));assert(!item.subject.includes('mail@example.org'));}
 const request:AssistantRequest={kind:'help',prompt:'Welche Anfragen sind da?',context:{brandName:'Eigener Betrieb',helpTopic:'cms'}};assert.equal(assistantHelpTopic(request),'inquiries');
 const proposal=guidedAssistantHelp(request,{inquiries:summary});assert(assistantProposalSchema.safeParse(proposal).success);assert(proposal.answer.includes('Zuletzt eingegangen:'));assert(proposal.answer.includes('Angebot'));assert(!JSON.stringify(proposal).includes('Private sender'));assert(!JSON.stringify(proposal).includes('Private body'));assert(!JSON.stringify(proposal).includes('sender@example.org'));
});

test('native CMS how-to answers actual media, SEO, design, structure and save questions with relevant navigation',()=>{
 const request:AssistantRequest={kind:'help',prompt:'',context:{brandName:'Eigener Betrieb',helpTopic:'cms'}};
 const cases=[['Wie ändere ich den SEO Seitentitel?','Seiteneinstellungen und SEO','pages'],['Wie kann ich ein Bild hochladen?','Mediathek','pages'],['Wo ändere ich die Farben?','Gestaltung','settings'],['Wie kann ich eine Section hinzufügen?','Abschnitt hinzufügen','pages'],['Was passiert beim Speichern?','öffentliche Website bleibt','pages']];
 for(const [prompt,phrase,action] of cases){const proposal=guidedAssistantHelp({...request,prompt},{pageCount:3});assert(proposal.answer.includes(phrase),prompt);assert.equal(proposal.actions[0].id,action);assert(assistantProposalSchema.safeParse(proposal).success);}
});
